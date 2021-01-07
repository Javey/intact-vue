import {normalizeProps} from './normalize';
import {h, getCurrentInstance} from 'vue';
import {NOOP} from '@vue/shared';

console.log(NOOP);

export default function functionalWrapper(Component) {
    function Ctor(props, context) {
        if (context) {
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
            });

            const vNode = Component(_props, true /* is in vue */);
            if (Array.isArray(vNode)) {
                return vNode.map(vNode => toVueVNode(vNode));
            }
            return toVueVNode(vNode, props);
        }
    }

    return Ctor;
}

function toVueVNode(vNode) {
    return h(
        vNode.tag,
        vNode.props
    );
}
