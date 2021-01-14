import {normalizeProps} from './normalize';
import {h, getCurrentInstance} from 'vue';
import Intact from 'intact/dist';
import {silentWarn, resetWarn} from './utils';

const {isStringOrNumber} = Intact.utils;

export default function functionalWrapper(Component) {
    function Ctor(props, context) {
        if (context) {
            // invoked by Vue
            const {forwardRef, ...rest} = props;
            // Vue will detect whether the slot is invoked outside or not,
            // but it does not affetch anything in here,
            // so we keep the warning silent
            silentWarn();
            const _props = normalizeProps({
                props: {...rest, ref: forwardRef},
                children: context.slots,
                type: {
                    Component,
                },
            });
            resetWarn();

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
