import Intact from 'intact/dist';
import Vue from 'vue';

const h = Intact.Vdt.miss.h;
const patch = Vue.prototype.__patch__;
const {get, set, extend, isArray, create} = Intact.utils;

export function normalizeChildren(vNodes) {
    if (isArray(vNodes)) {
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
    const type = typeof vNode;
    if (type === 'string' || type === 'number') return vNode;
    // is a intact vnode
    if (vNode.type) return vNode;
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
    }
    if (vNode.text !== undefined) {
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
            let tmp;
            if (propTypes && 
                (
                    // value is Boolean
                    (tmp = propTypes[key]) === Boolean ||
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
            props[key] = value; 
        }
    }

    // add className
    const className = handleClassName(vNode);
    if (className !== undefined) {
        props.className = className;
    }
    // add style
    const style = handleStyle(vNode);
    if (style !== undefined) {
        props.style = style;
    }

    // add key
    if (vNode.key) {
        props.key = vNode.key;
    } else if (data.key) {
        props.key = data.key;
    }

    // if exists scoped slots
    const scopedSlots = data.scopedSlots;
    if (scopedSlots) {
        const blocks = props._blocks ? props._blocks : (props._blocks = {});
        for (const key in scopedSlots) {
            blocks[key] = function(parent, ...args) {
                return normalizeChildren(scopedSlots[key].apply(this, args));
            };
        }
    }

    // if exists v-model
    const model = data.model;
    if (model) {
        props.value = model.value;
        props['v-model'] = model.expression;
    }
    if (data.directives) {
        const directives = data.directives;
        for (let i = 0; i < directives.length; i++) {
            const model =  directives[i];
            if (model.name === 'model') {
                // for vue@2.1.8
                props.value = model.value;
                props['v-model'] = model.expression;
                break;
            } else if (model.name === 'show' && !model.value) {
                if (props.style) {
                    props.style.display = 'none';
                } else {
                    props.style = {display: 'none'}
                }
            }
        }
    }

    // convert ref string to function
    handleRef(vNode, props);

    const listeners = componentOptions.listeners;
    if (listeners) {
        for (let key in listeners) {
            let _cb = listeners[key];
            let cb = _cb;

            if (key === 'input') {
                // is a v-model directive of vue
                key = `$change:value`;
                cb = (c, v) => _cb(v);
            } else if (key.substr(0, 7) === 'update:') {
                // delegate update:prop(sync modifier) to $change:prop
                key = `$change:${key.substr(7)}`;
                cb = (c, v) => _cb(v);
            }

            // if there is a $change:prop originally, set it as array
            const name = `ev-${key}`;
            if (props[name]) {
                props[name] = [props[name], cb]
            } else {
                props[name] = cb;
            }
        }
    }

    // handle children and blocks
    const slots = vNode.slots || resolveSlots(componentOptions.children);
    const {children, _blocks} = getChildrenAndBlocks(slots);
    // for Intact Functional component, the blocks has been handled
    // In this case, we should merge them 
    props.children = children;
    if (props._blocks) {
        extend(props._blocks, _blocks);
    } else {
        props._blocks = _blocks;
    }

    normalizeContext(vNode, props);

    return props;
}

function normalizeContext(vNode, props) {
    const $data = vNode.context.$data;
    props._context = {
        data: {
            get(name) {
                if (name != null) {
                    return get($data, name);
                } else {
                    return $data;
                }
            },
            set(name, value) {
                set($data, name, value);
            }
        }
    };
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
            const _props = normalizeProps({
                // fake
                componentOptions: {
                    Ctor: Component,
                    listeners: props.listeners,
                },
                data: props.data,
                slots: props.slots(),
                context: {
                    $data: props.parent.$data,
                },
            });
            const vNode = Component(_props, true /* is in vue */);
            if (isArray(vNode)) {
                throw new Error('Array children does not be supported.');
            }

            const attrs = {};
            const __props = {attrs};
            for (const key in vNode.props) {
                if (~['children', '_context', 'className', 'style', 'ref', 'key'].indexOf(key)) continue;
                attrs[key] = vNode.props[key];
            }
            if (props.data.ref) {
                __props.ref = props.data.ref;
            }
            if (vNode.props.className) {
                __props.staticClass = vNode.props.className;
            }
            if (vNode.props.style) {
                __props.staticStyle = vNode.props.style;
            }
            __props.key = vNode.props.key;

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
        // let the component destroy by itself
        this.destroyed = true; 
        this._addProps(nextVNode);
        return patch(null, nextVNode.props.vueVNode, false, false, this.parentDom);
    }

    update(lastVNode, nextVNode) {
        this._addProps(nextVNode);
        return patch(lastVNode.props.vueVNode, nextVNode.props.vueVNode, false, false, this.parentDom);
    }

    destroy(vNode) {
        patch(vNode.props.vueVNode, null);
    }

    // maybe the props has been changed, so we change the vueVNode's data
    _addProps(vNode) {
        // for Intact reusing the dom
        this.vdt = {vNode};
        const props = vNode.props;
        const vueVNode = props.vueVNode;
        for (let key in props) {
            if (key === 'vueVNode') continue;
            if (!vueVNode.data) vueVNode.data = {};
            const data = vueVNode.data;
            const prop = props[key];
            // is event
            if (key.substr(0, 3) === 'ev-') {
                if (!data.on) data.on = {};
                data.on[key.substr(3)] = prop;
            } else {
                if (!data.attrs) data.attrs = {};
                data.attrs[key] = prop;
            }
        }
    }
}

function handleRef(vNode, props) {
    const key = vNode.data.ref;
    if (key) {
        const refs = vNode.context.$refs;
        let ref;
        props.ref = function(i) { 
            if (i) {
                ref = i;
                if (vNode.data.refInFor) {
                    if (!isArray(refs[key])) {
                        refs[key] = [ref];
                    } else if (refs[key].indexOf(ref) < 0) {
                        refs[key].push(ref);
                    }
                } else {
                    refs[key] = ref; 
                }
            } else {
                if (isArray(refs[key])) {
                    var index = refs[key].indexOf(ref);
                    if (~index) {
                        refs[key].splice(index, 1);
                    }
                } else {
                    refs[key] = ref = undefined;
                }
            }
        };
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
    if (className == null) return '';
    if (isArray(className)) {
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
            return extend(data.staticStyle, style);
        }
    }

    return style;
}

function getStyleBinding(style) {
    if (!style) return style;

    if (isArray(style)) {
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
            extend(res, arr[i]);
        }
    }

    return res;
}


const cache = create(null);
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
