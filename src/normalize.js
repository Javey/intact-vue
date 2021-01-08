import Intact from 'intact/dist';
import Wrapper from './Wrapper';
import {camelize, Text, Comment, Fragment, isVNode} from 'vue';
import {EMPTY_OBJ} from '@vue/shared';

const {h} = Intact.Vdt.miss;
const {hasOwn, isArray, get, set, each} = Intact.utils;

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
            // vNode.ref
        );
    } else {
        // ignore comment vNode
        if (vNode.type === Comment) return null;
        // spread fragment
        if (vNode.type === Fragment) {
            return normalizeChildren(vNode.children);
        }
        vNode = h(Wrapper, {vueVNode: vNode}, null, null, vNode.key);
    }

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
    // normalizeContext(owner, props);

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

    // the default slot maybe a scope slot, but we can not detect
    // whether it is or not, so we try to normalize it as children and
    // then treat it as a default scope slot too.
    if (slots.default) {
        const slot = slots.default;
        try {
            props.children = normalizeChildren(ensureValidVNode(slot()));
        } catch (e) {  }
    }

    let blocks;
    for (const key in slots) {
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

// function normalizeContext(owner, props) {
    // // if the vNode is returned by functionWrapper, then the _context has injected
    // if (props._context) return;

    // const data = owner.data;
    // props._context = {
        // data: {
            // get(name) {
                // if (name != null) {
                    // return get(data, name);
                // } else {
                    // return data;
                // }
            // },

            // set(name, value) {
                // set(data, name, value);
            // }
        // }
    // }
// }

const onRE = /^on[^a-z]/;
const isOn = (key) => onRE.test(key);

function isIntactComponent(vNode) {
    return !!vNode.type.Component;
}

function ensureValidVNode(vNodes) {
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
