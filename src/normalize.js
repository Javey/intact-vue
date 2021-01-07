import Intact from 'intact/dist';
import Wrapper from './Wrapper';
import {camelize, Text, Comment, Fragment} from 'vue';
import {EMPTY_OBJ} from '@vue/shared';

const {h} = Intact.Vdt.miss;
const {hasOwn, isArray} = Intact.utils;

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

    if (slots) {
        const {children, _blocks} = normalizeSlots(slots);
        props.children = children;
        props._blocks = _blocks;
    }

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

function normalizeSlots(slots) {
    const {default: d, ...rest} = slots;
    let blocks;
    if (rest) {
        blocks = {};
        for (const key in rest) {
            blocks[key] = function(parent, ...args) {
                return normalizeChildren(rest[key](...args));
            }
        }
    }

    return {
        children: d ? normalizeChildren(d()) : undefined,
        _blocks: blocks,
    }
}

function normalizeEvents(props, key, value) {
    let name;
    let cb = value;
    const changeCallback = (propName) => (c, v) => {
        const modifiersKey = `${propName === 'value' ? 'model' : propName}Modifiers`;
        const {number, trim} = props[modifiersKey] || EMPTY_OBJ;
        if (trim) {
            v = String(v).trim();
        } else if (number) {
            v = Number(v);
        }
        value(v);
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

const onRE = /^on[^a-z]/;
const isOn = (key) => onRE.test(key);

function isIntactComponent(vNode) {
    return !!vNode.type.Component;
}
