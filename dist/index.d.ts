import { Component as IntactComponent, VNodeComponentClass, IntactDom, Props, ComponentClass } from 'intact';
import { ComponentOptions, ComponentInternalInstance } from 'vue';
import { normalizeChildren } from './normalize';
import { functionalWrapper } from './functionalWrapper';
export interface IntactComponentOptions extends ComponentOptions {
    Component: typeof Component;
}
declare type VNodeComponentClassMaybeWithVueInstance = VNodeComponentClass<ComponentClass> & {
    _vueInstance?: ComponentInternalInstance;
};
export declare class Component<P = {}> extends IntactComponent<P> {
    static __cache: IntactComponentOptions | null;
    static get __vccOpts(): IntactComponentOptions;
    static functionalWrapper: typeof functionalWrapper;
    static normalize: typeof normalizeChildren;
    vueInstance: ComponentInternalInstance | undefined;
    private isVue;
    $props: P;
    constructor(props: Props<P, Component<P>> | null | undefined, $vNode: VNodeComponentClassMaybeWithVueInstance, $SVG: boolean, $mountedQueue: Function[], $parent: ComponentClass | null);
    $render(lastVNode: VNodeComponentClass | null, nextVNode: VNodeComponentClass, parentDom: Element, anchor: IntactDom | null, mountedQueue: Function[]): void;
    $update(lastVNode: VNodeComponentClass, nextVNode: VNodeComponentClass, parentDom: Element, anchor: IntactDom | null, mountedQueue: Function[], force: boolean): void;
}
export {};
