import {normalizeProps} from './normalize';
import {h, getCurrentInstance} from 'vue';

export default function functionalWrapper(Component) {
    function Ctor(props, context) {
        if (context) {
            const {forwardRef, ...rest} = props;
            // invoked by Vue
            const _props = normalizeProps({
                props: {...rest, ref: forwardRef},
                children: context.slots,
                type: {
                    Component,
                },
            });

            const vNode = Component(_props, true /* is in vue */);
            if (Array.isArray(vNode)) {
                return vNode.map(vNode => toVueVNode(vNode));
            }
            return toVueVNode(vNode);
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
