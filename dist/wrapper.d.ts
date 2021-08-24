import { ComponentClass, Props, VNodeComponentClass, VNode, IntactDom } from 'intact';
import { VNode as VueVNode } from 'vue';
export interface WrapperProps {
    vnode: VueVNode;
}
export declare class Wrapper implements ComponentClass<WrapperProps> {
    props: Props<WrapperProps, ComponentClass<WrapperProps>>;
    $vNode: VNodeComponentClass<ComponentClass<WrapperProps>>;
    $SVG: boolean;
    $mountedQueue: Function[];
    $parent: ComponentClass | null;
    $inited: boolean;
    $lastInput: VNode;
    constructor(props: Props<WrapperProps, ComponentClass<WrapperProps>>, $vNode: VNodeComponentClass<ComponentClass<WrapperProps>>, $SVG: boolean, $mountedQueue: Function[], $parent: ComponentClass | null);
    $init(props: WrapperProps | null): void;
    $render(lastVNode: VNodeComponentClass | null, vNode: VNodeComponentClass, parentDom: Element, anchor: IntactDom | null): void;
    $update(lastVNode: VNodeComponentClass, vNode: VNodeComponentClass, parentDom: Element, anchor: IntactDom | null): void;
    $unmount(vNode: VNodeComponentClass, nextVNode: VNodeComponentClass | null): void;
}
