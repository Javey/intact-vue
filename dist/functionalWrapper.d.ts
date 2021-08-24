import { VNode as VueVNode } from 'vue';
import { ComponentFunction, NormalizedChildren, VNode } from 'intact';
export declare type ComponentFunctionForVue = ComponentFunction & {
    (props: any, isVue?: boolean): NormalizedChildren;
};
export declare function functionalWrapper(Component: ComponentFunctionForVue): {
    (props: any, context?: any): string | number | boolean | VNode<any> | VueVNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }> | import("intact").Children[] | (VueVNode<import("vue").RendererNode, import("vue").RendererElement, {
        [key: string]: any;
    }> | undefined)[] | null | undefined;
    displayName: string;
};
