import Intact from 'intact/dist';
import Wrapper from './Wrapper';
import {camelize, Text, Comment, Fragment, isVNode, vShow} from 'vue';
import {isIntactComponent, silentWarn, resetWarn} from './utils';

const {h} = Intact.Vdt.miss;
const {hasOwn, isArray, get, set, each, isString} = Intact.utils;

export function normalize(vNode) {
    if (vNode == null) return vNode;
    const type = typeof vNode;
    if (type === 'string' || type === 'number') return vNode;
    // is a intact vnode
    if (typeof vNode.type === 'number') return vNode;
    if (vNode.type === Text) {
        return vNode.children;
    }

    if (isIntactComponent(vNode)) {
        vNode = h(
            vNode.type.Component,
            normalizeProps(vNode),
            null,
            null,
            vNode.key,
            vNode.ref
        );
    } else {
        // ignore comment vNode
        if (vNode.type === Comment) return null;
        // spread fragment
        if (vNode.type === Fragment) {
            return normalizeChildren(vNode.children);
        }
        // Vue will add key 0 to v-if, but Intact will ignore it, so we cast it string
        const key = vNode.key === 0 ? '0' : vNode.key;
        vNode = h(Wrapper, {vueVNode: vNode}, null, vNode.props && vNode.props.class, key);
    }

    // tell Vue that this is a read only object, and don't reactive it
    vNode.__v_isReadonly = true;

    return vNode;
}

export function normalizeChildren(vNodes) {
    const loop = (vNodes) => {
        if (Array.isArray(vNodes)) {
            const ret = [];
            vNodes.forEach(vNode => {
                if (Array.isArray(vNode)) {
                    ret.push(...loop(vNode));
                } else {
                    ret.push(normalize(vNode));
                }
            });
            return ret;
        }
        return normalize(vNodes);
    }
    const ret = loop(vNodes);
    if (Array.isArray(ret)) {
        const l = ret.length;
        return l === 0 ? undefined : l === 1 ? ret[0] : ret;
    }
    return ret;
}

export function normalizeProps(vNode) {
    const attrs = vNode.props;
    const slots = vNode.children;
    const Component = vNode.type.Component;
    const props = {};
    const propTypes = Component.propTypes;
    for (let key in attrs) {
        let value = attrs[key];
        switch (key) {
            case 'class':
                props.className = value;
                break;
            case 'modelValue':
                props.value = value;
                break;
            default:
                if (isOn(key)) {
                    normalizeEvents(props, key, value);
                    break;
                }

                if (propTypes) {
                    const camelizedKey = camelize(key);
                    value = normalizeBoolean(propTypes, key, camelizedKey, value);
                    key = camelizedKey;
                }

                props[key] = value;
                break;
        }
    }

    normalizeSlots(slots, props);
    normalizeDirs(vNode.dirs, props);

    return props;
}

function normalizeBoolean(propTypes, key, camelizedKey, value) {
    if (hasOwn.call(propTypes, camelizedKey)) {
        let tmp;
        if (
            (
                // value is Boolean
                (tmp = propTypes[camelizedKey]) === Boolean ||
                tmp && (
                    // value contains Boolean
                    isArray(tmp) && tmp.indexOf(Boolean) > -1 ||
                    // value.type is Boolean
                    tmp.type === Boolean ||
                    // value.type contains Boolean
                    isArray(tmp.type) && tmp.type.indexOf(Boolean) > -1
                )
            ) &&
            (value === '' || value === key)
        ) {
            value = true;
        }
    }

    return value;
}

function normalizeSlots(slots, props) {
    if (!slots) return;

    // is array children
    if (isArray(slots)) {
        return props.children = normalizeChildren(slots);
    }

    // is string
    if (isString(slots)) {
        return props.children = slots;
    }

    // the default slot maybe a scope slot, but we can not detect
    // whether it is or not, so we try to normalize it as children and
    // then treat it as a default scope slot too.
    if (slots.default) {
        const slot = slots.default;
        try {
            // Vue will warn if we get property of undefined, we keep it silent
            silentWarn();
            props.children = normalizeChildren(ensureValidVNode(slot()));
            resetWarn();
        } catch (e) {
            console.warn(e);
        }
    }

    let blocks;
    for (const key in slots) {
        if (key === '_') continue;
        const slot = slots[key];
        if (!blocks) blocks = {};
        blocks[key] = function(parent, ...args) {
            // if the content is invalid, use parent instead
            // this is the default behavior of Vue
            const validSlotContent = ensureValidVNode(slot(...args));
            return validSlotContent ?  normalizeChildren(validSlotContent) : parent();
        };
    }
    if (blocks) {
        props._blocks = blocks;
    }
}

const EMPTY_OBJ = {};
function normalizeEvents(props, key, value) {
    let name;
    let cb = value;
    const _isArray = isArray(value);
    const changeCallback = (propName) => (c, v) => {
        const modifiersKey = `${propName === 'value' ? 'model' : propName}Modifiers`;
        const {number, trim} = props[modifiersKey] || EMPTY_OBJ;
        if (trim) {
            v = String(v).trim();
        } else if (number) {
            v = Number(v);
        }
        if (_isArray) {
            each(value, value => value(v));
        } else {
            value(v);
        }
    };

    if (key.startsWith('onUpdate:')) {
        let propName = camelize(key.substr(9));
        if (propName === 'modelValue') propName = 'value';
        name = `$change:${propName}`;
        cb = changeCallback(propName);
    } else {
        key = key.substring(2);
        name = key[0].toLowerCase() + key.substring(1);
    }

    // if there is a $change:prop originally, set it as array
    name = `ev-${name}`;
    if (props[name]) {
        props[name] = [].concat(props[name], cb);
    } else {
        props[name] = cb;
    }
}

function normalizeDirs(dirs, props) {
    if (!dirs) return;

    dirs.find(({dir, value}) => {
        // only handle v-show
        if (dir === vShow) {
            if (!value) {
                (props.style || (props.style = {})).display = 'none';
            }
            return true;
        }
    });
}

const onRE = /^on[^a-z]/;
const isOn = (key) => onRE.test(key);

function ensureValidVNode(vNodes) {
    if (!Array.isArray(vNodes)) vNodes = [vNodes];
    return vNodes.some(child => {
        if (!isVNode(child)) {
            return true;
        }
        if (child.type === Comment) {
            return false;
        }
        if (child.type === Fragment && !ensureValidVNode(child.children)) {
            return false;
        }
        return true;
    }) ? vNodes : null;
}
