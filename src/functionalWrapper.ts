import {normalizeProps, VNodeAtom} from './normalize';
import {h, VNode as VueVNode} from 'vue';
import {ComponentFunction, NormalizedChildren, VNode} from 'intact';
import {isStringOrNumber} from 'intact-shared';

type ComponentFunctionForVue = ComponentFunction & {
     (props: any, isVue?: boolean): NormalizedChildren 
}

export function functionalWrapper(Component: ComponentFunctionForVue) {
    function Ctor(props: any, context: any) {
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
            } as unknown as VueVNode);

            const vNode = Component(_props, true /* is in vue */);
            if (Array.isArray(vNode)) {
                return vNode.map((vNode: VNode) => toVueVNode(vNode));
            }
            return toVueVNode(vNode);
        } else {
            // invoked by Intact
            return Component(props);
        }
    }

    // Ctor.cid = cid;
    Ctor.displayName = Component.displayName || Component.name;

    return Ctor;
}

function toVueVNode(vNode: VNodeAtom) {
    if (isStringOrNumber(vNode)) return vNode;
    if (vNode) {
        return h(
            vNode.tag as any,
            vNode.props
        );
    }
}
