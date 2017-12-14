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
    return vNodes;
}

export function normalize(vNode) {
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
    return h(Wrapper, {vueVNode: vNode}, null, className(vNode));
}

export function normalizeProps(vNode) {
    const componentOptions = vNode.componentOptions;
    const data = vNode.data;
    const attrs = data.attrs;
    const propTypes = componentOptions.Ctor.propTypes;
    const props = {};

    if (attrs) {
        for (const key in attrs) {
            if (key === 'staticClass' || key === 'class') continue;
            let value = attrs[key];
            if (propTypes && propTypes[key] === Boolean && value === '') {
                value = true;
            }
            props[key] = value; 
        }
    }

    // add className
    props.className = className(vNode);


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
        Component(props);
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
                            return get(data, name);
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
            const _className = className(props);
            if (_className) {
                _props.className = _className;
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

// export class MockVueComponent {
    // static options = Vue.options;
    // // mock api
    // $on() {}
// }

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

function className(vNode) {
    let className;
    let data = vNode.data;
    if (data) {
        if (data.staticClass) {
            if (!className) className = data.staticClass;
        }
        if (data.class) {
            if (!className) {
                className = data.class;
            } else {
                className += ' ' + data.class;
            }
        }
    }

    return className;
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
