import Intact from 'intact/dist';
import Wrapper from './Wrapper';

const {h} = Intact.Vdt.miss;

export function normalize(vNode) {
    if (vNode == null) return vNode;
    const type = typeof vNode;
    if (type === 'string' || type === 'number') return vNode;
    // is a intact vnode
    if (typeof vNode.type === 'number') return vNode;
    // if (vNode.text !== undefined) {
        // return vNode.text;
    // }

    // if (isIntactComponent(vNode)) {
        // const options = vNode.componentOptions;
        // vNode = h(
            // options.Ctor,
            // normalizeProps(vNode),
            // null,
            // null,
            // vNode.key,
            // vNode.ref
        // );
    // } else {
        vNode = h(Wrapper, {vueVNode: vNode}, null, null, vNode.key);
    // }

    return vNode;
}

export function createVNodeBySetupContext(Component, ctx) {
    return h(Component, normalizeProps(ctx));
}

function normalizeChildren(vNodes) {
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

function normalizeProps({attrs, slots}) {
    const props = {};
    for (const key in attrs) {
        if (key === 'class') {
            props.className = attrs['class'];
        } else {
            props[key] = attrs[key];
        }
    }
    const {children, _blocks} = normalizeSlots(slots);
    props.children = children;
    props._blocks = _blocks;

    return props;
}

function normalizeSlots(slots) {
    const {default: d, ...rest} = slots;
    let blocks;
    if (rest) {
        blocks = {};
        for (const key in rest) {
            blocks[key] = function() {
                return normalizeChildren(rest[key]());
            }
        }
    }

    return {
        children: d ? normalizeChildren(d()) : undefined,
        _blocks: blocks,
    }
}
