import { VNode } from 'intact';
import { VNode as VueVNode, VNodeArrayChildren, VNodeChild } from 'vue';
declare type VNodeChildAtom = Exclude<VNodeChild, VNodeArrayChildren | void>;
export declare type VNodeAtom = VNode | null | undefined | string | number;
export declare function normalize(vnode: VNodeChildAtom): VNodeAtom;
export declare function isIntactComponent(vnode: VueVNode): boolean;
export declare function normalizeChildren(vNodes: VNodeArrayChildren | VNodeChildAtom): VNodeAtom | VNodeAtom[];
export declare function normalizeProps(vnode: VueVNode): any;
export {};
