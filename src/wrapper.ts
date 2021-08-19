import {ComponentClass, Props, VNodeComponentClass, VNode, IntactDom} from 'intact';
import {
    VNode as VueVNode,
    createApp,
    h,
    getCurrentInstance,
    KeepAlive,
    cloneVNode,
    Fragment,
    RendererElement,
    RendererNode,
    ComponentInternalInstance,
    SuspenseBoundary,
} from 'vue';
import type {Component} from './';

type PatchFn = (
    n1: VueVNode | null, // null means this is a mount
    n2: VueVNode,
    container: RendererElement,
    anchor?: RendererNode | null,
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: SuspenseBoundary | null,
    isSVG?: boolean,
    slotScopeIds?: string[] | null,
    optimized?: boolean
) => void;

type UnmountFn = (
    vnode: VueVNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove?: boolean,
    optimized?: boolean
) => void;

// we must use this hack method to get patch function
let internals: {p: PatchFn, um: UnmountFn};
createApp({
    render() {
        return h(KeepAlive, null, h(function() {
            const instance = getCurrentInstance() as any;
            internals = instance.parent.ctx.renderer;
        }));
    }
}).mount(document.createElement('div'));
const {p: patch, um: unmount} = internals!;

export interface WrapperProps {
    vnode: VueVNode
}

export class Wrapper implements ComponentClass<WrapperProps> {
    public $inited: boolean = false;
    public $lastInput: VNode | null = null;

    constructor(
        public props: Props<WrapperProps, ComponentClass<WrapperProps>>,
        public $vNode: VNodeComponentClass<ComponentClass<WrapperProps>>,
        public $SVG: boolean,
        public $mountedQueue: Function[],
        public $parent: ComponentClass | null,
    ) { }

    $init(props: WrapperProps | null): void { }

    $render(
        lastVNode: VNodeComponentClass | null,
        vNode: VNodeComponentClass,
        parentDom: Element,
        anchor: IntactDom | null,
        // mountedQueue: Function[]
    ): void {
        const {vnode} = vNode.props!;
        const parent = (this.$parent as Component).vueInstance!.$parent!.$;
        patch(null, vnode, parentDom, anchor, parent, null, this.$SVG);
    }

    $update(
        lastVNode: VNodeComponentClass,
        vNode: VNodeComponentClass,
        parentDom: Element,
        anchor: IntactDom | null,
        mountedQueue: Function[],
        force: boolean
    ): void {
        const {vnode: lastVnode} = lastVNode.props!;
        const {vnode: nextVnode} = vNode.props!;
        const parent = (this.$parent as Component).vueInstance!.$parent!.$;
        patch(lastVnode, nextVnode, parentDom, anchor, parent, null, this.$SVG);
    }

    $unmount(
        vNode: VNodeComponentClass,
        nextVNode: VNodeComponentClass | null
    ): void  {
        const parent = (this.$parent as Component).vueInstance!.$parent!.$;
        unmount(vNode.props!.vnode, parent, null, false);
    }
}
