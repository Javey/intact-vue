import {normalizeProps} from './normalize';
import {h, getCurrentInstance} from 'vue';
import Intact from 'intact/dist';
import {silentWarn, resetWarn, cid} from './utils';

const {isStringOrNumber} = Intact.utils;

export default function functionalWrapper(Component) {
    function Ctor(props, context) {
        if (context) {
            // invoked by Vue
            const {forwardRef, ...rest} = props;
            const _props = normalizeProps({
                props: rest,
                children: context.slots,
                type: {
                    Component,
                },
                ref: forwardRef,
            });

            const vNode = Component(_props, true /* is in vue */);
            if (Array.isArray(vNode)) {
                return vNode.map(vNode => toVueVNode(vNode));
            }
            return toVueVNode(vNode);
        } else {
            // invoked by Intact
            return Component(props);
        }
    }

    Ctor.cid = cid;
    Ctor.displayName = Component.displayName || Component.name;

    return Ctor;
}

function toVueVNode(vNode) {
    if (isStringOrNumber(vNode)) return vNode;
    if (vNode) {
        return h(
            vNode.tag,
            vNode.props
        );
    }
}
