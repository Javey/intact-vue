import Intact from 'intact/dist/intact';
import Vue from 'vue';

const h = Intact.Vdt.miss.h;
const patch = Vue.prototype.__patch__;
const {get, set} = Intact.utils;

export function normalizeChildren(vNodes) {
    if (Array.isArray(vNodes)) {
        const ret = [];
        vNodes.forEach(vNode => {
            ret.push(normalize(vNode));
        });
        return ret;
    }
    return normalize(vNodes);
}

export function normalize(vNode) {
    if (vNode == null) return vNode;
    if (isIntactComponent(vNode)) {
        const options = vNode.componentOptions;
        return h(
            options.Ctor,
            normalizeProps(vNode),
            null,
            null,
            vNode.key,
            vNode.ref
        );
    } else if (vNode.text !== undefined) {
        return vNode.text;
    }
    return h(Wrapper, {vueVNode: vNode}, null, handleClassName(vNode));
}

export function normalizeProps(vNode) {
    const componentOptions = vNode.componentOptions;
    const data = vNode.data;
    const attrs = data.attrs;
    const propTypes = componentOptions.Ctor.propTypes;
    const props = {};

    if (attrs) {
        for (const key in attrs) {
            if (~['staticClass', 'class', 'style', 'staticStyle'].indexOf(key)) continue;
            let value = attrs[key];
            if (propTypes && propTypes[key] === Boolean && value === '') {
                value = true;
            }
            props[key] = value; 
        }
    }

    // add className
    props.className = handleClassName(vNode);
    // add style
    props.style = handleStyle(vNode);

    // if exists v-model
    if (data.model) {
        props.value = data.model.value;
    }

    for (let key in componentOptions.listeners) {
        // is a v-model directive of vue
        if (key === 'input') {
            props[`ev-$change:value`] = function(c, v) {
                componentOptions.listeners.input(v);
            }
        } else {
            props[`ev-${key}`] = componentOptions.listeners[key];
        }
    }

    // handle children and blocks
    const slots = resolveSlots(componentOptions.children);
    Object.assign(props, getChildrenAndBlocks(slots));

    return props;
}

export function getChildrenAndBlocks(slots) {
    const {default: d, ...rest} = slots; 
    let blocks;
    if (rest) {
        blocks = {};
        for (const key in rest) {
            blocks[key] = function() {
                return normalizeChildren(rest[key]);
            }
        }
    }

    return {
        children: normalizeChildren(d),
        _blocks: blocks,
    };
}

export function functionalWrapper(Component) {
    function Ctor(props) {
        return Component(props);
    }

    Ctor.options = {
        functional: true,
        render(h, props) {
            const data = props.parent.$data;
            const _props = {
                children: props.children,
                _context: {
                    data: {
                        get(name) {
                            if (name != null) {
                                return get(data, name);
                            } else {
                                return data;
                            }
                        },
                        set(name, value) {
                            set(data, name, value);
                        }
                    }
                }
            };
            for (const key in props.data.attrs) {
                _props[key] = props.data.attrs[key];
            }
            const className = handleClassName(props);
            if (className) {
                _props.className = className;
            }
            const style = handleStyle(props);
            if (style) {
                _props.style = style;
            }
            const vNode = Component(_props);
            const attrs = {};
            const __props = {attrs};
            for (const key in vNode.props) {
                if (~['children', '_context', 'className'].indexOf(key)) continue;
                attrs[key] = vNode.props[key];
            }
            if (vNode.props.className) {
                __props.staticClass = vNode.props.className;
            }
            return h(
                vNode.tag,
                __props,
                vNode.props.children,
            );
        }
    }

    Ctor.cid = 'IntactFunctionalComponent';

    return Ctor;
}

class Wrapper {
    init(lastVNode, nextVNode) {
        return patch(null, nextVNode.props.vueVNode, false, false, this.parentDom);
    }

    update(lastVNode, nextVNode) {
        return patch(lastVNode.props.vueVNode, nextVNode.props.vueVNode, false, false, this.parentDom);
    }

    destroy(vNode) {
        patch(vNode.props.vueVNode, null);
    }
}

function handleClassName(vNode) {
    let className;
    let data = vNode.data;
    if (data) {
        if (data.staticClass) {
            className = data.staticClass;
        }
        if (data.class) {
            if (!className) {
                className = stringifyClass(data.class);
            } else {
                className += ' ' + stringifyClass(data.class);
            }
        }
    }

    return className;
}

function stringifyClass(className) {
    if (Array.isArray(className)) {
        return stringifyArray(className);
    }
    if (typeof className === 'object') {
        return stringifyObject(className);
    }
    if (typeof className === 'string') {
        return className;
    }

    return '';
}

function stringifyArray(value) {
    let res = '';
    let stringified;
    for (let i = 0; i < value.length; i++) {
        if ((stringified = stringifyClass(value[i])) != null && stringified !== '') {
            if (res) res += ' ';
            res += stringified;
        }
    }

    return res;
}

function stringifyObject(value) {
    let res = '';
    for (let key in value) {
        if (value[key]) {
            if (res) res += ' ';
            res += key;
        }
    }

    return res;
}

function handleStyle(vNode) {
    let style;
    let data = vNode.data;
    if (data) {
        style = getStyleBinding(data.style);
        if (data.staticStyle) {
            return Object.assign(data.staticStyle, style);
        }
    }

    return style;
}

function getStyleBinding(style) {
    if (!style) return style;

    if (Array.isArray(style)) {
        return toObject(style);
    }
    if (typeof style === 'string') {
        return parseStyleText(style);
    }

    return style;
}

function toObject(arr) {
    const res = {};
    for (let i = 0; i < arr.length; i++) {
        if (arr[i]) {
            Object.assign(res, arr[i]);
        }
    }

    return res;
}


const cache = Object.create(null);
function parseStyleText(cssText) {
    const hit = cache[cssText];
    if (hit) return hit;

    const res = {};
    const listDelimiter = /;(?![^(]*\))/g;
    const propertyDelimiter = /:(.+)/;
    cssText.split(listDelimiter).forEach(function (item) {
        if (item) {
            var tmp = item.split(propertyDelimiter);
            tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
        }
    });
    cache[cssText] = res;

    return res;
}

function isIntactComponent(vNode) {
    let i = vNode.data;
    return i && (i = i.hook) && (i = i.init) &&
        vNode.componentOptions.Ctor.cid === 'IntactVue';
}

// copy from vue/src/core/instance/render-helpers/resolve-slots.js
function resolveSlots(children) {
    const slots = {}
    if (!children) {
        return slots;
    }
    const defaultSlot = [];
    for (let i = 0, l = children.length; i < l; i++) {
        const child = children[i];
        const data = child.data;
        // remove slot attribute if the node is resolved as a Vue slot node
        if (data && data.attrs && data.attrs.slot) {
            delete data.attrs.slot;
        }
        if (data && data.slot != null) {
            const name = data.slot;
            const slot = (slots[name] || (slots[name] = []));
            if (child.tag === 'template') {
                slot.push.apply(slot, child.children || []);
            } else {
                slot.push(child);
            }
        } else {
            (slots.default || (slots.default = [])).push(child);
        }
    }
    // ignore slots that contains only whitespace
    for (const name in slots) {
        if (slots[name].every(isWhitespace)) {
            delete slots[name];
        }
    }
    return slots;
}

function isWhitespace(node) {
      return (node.isComment && !node.asyncFactory) || node.text === ' ';
}
