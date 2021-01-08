import {normalizeProps} from './normalize';
import {h, getCurrentInstance} from 'vue';
import {NOOP} from '@vue/shared';

const ownerQueue = [];

export default function functionalWrapper(Component) {
    function Ctor(props, context) {
        if (context) {
            const owner = ownerQueue.shift();
            const vueInstance = getCurrentInstance();
            const vueVNode = vueInstance.vnode;
            const ref = vueVNode.ref;
            let props = vueVNode.props;
            // forward ref
            if (ref) {
                props = {...props, ref: {...ref}};
                ref.r = NOOP;
            }
            // invoked by Vue
            const _props = normalizeProps({
                props,
                children: context.slots,
                type: {
                    Component,
                },
                ref,
                component: vueInstance,
            }, owner);

            const vNode = Component(_props, true /* is in vue */);
            if (Array.isArray(vNode)) {
                return vNode.map(vNode => toVueVNode(vNode, owner));
            }
            return toVueVNode(vNode, owner);
        }
    }

    Object.defineProperty(Ctor, '__vccOpts', {
        get() {
            const owner = getCurrentInstance();
            ownerQueue.push(owner);
            return Ctor;
        }
    });

    return Ctor;
}

function toVueVNode(vNode, owner) {
    vNode = h(
        vNode.tag,
        vNode.props
    );
    vNode._owner = owner;

    return vNode;
}
