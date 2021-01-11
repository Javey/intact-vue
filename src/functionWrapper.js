import {normalizeProps} from './normalize';
import {h, getCurrentInstance} from 'vue';
import {NOOP} from '@vue/shared';
import {setCurrentInstance} from '@vue/runtime-core';

export default function functionalWrapper(Component) {
    function Ctor(props, context) {
        if (context) {
            // we must set currentInstance to null to let getCurrentInstance return currentRenderInstance
            // const ctx = getCurrentInstance();
            // setCurrentInstance(null);
            // const vueInstance = getCurrentInstance();
            // setCurrentInstance(ctx);
            // const vueVNode = vueInstance.vnode;
            // const ref = vueVNode.ref;
            // let props = vueVNode.props;
            // forward ref
            // if (ref) {
                // props = {...props, ref: {...ref}};
                // ref.r = NOOP;
            // }
            const {forwardRef, ...rest} = props;
            // invoked by Vue
            const _props = normalizeProps({
                props: {...rest, ref: forwardRef},
                children: context.slots,
                type: {
                    Component,
                },
                // ref: forwardRef,
                // component: vueInstance,
            });

            const vNode = Component(_props, true /* is in vue */);
            if (Array.isArray(vNode)) {
                return vNode.map(vNode => toVueVNode(vNode));
            }
            return toVueVNode(vNode);
        }
    }

    // Object.defineProperty(Ctor, '__vccOpts', {
        // get() {

            // return Ctor;
        // }
    // });

    return Ctor;
}

function toVueVNode(vNode) {
    return h(
        vNode.tag,
        vNode.props
    );
}
