import {Component as IntactComponent, VNodeComponentClass, mount, patch, unmount, findDomFromVNode, IntactDom, Props, ComponentClass} from 'intact';
import {DefineComponent, ComponentOptions, ComponentPublicInstance, createVNode, Comment, ComponentInternalInstance, EmitsOptions, VNodeProps, AllowedComponentProps, ComponentCustomProps} from 'vue';
import {normalize, normalizeChildren} from './normalize';
import {functionalWrapper} from './functionalWrapper';
import {isFunction} from 'intact-shared';
import {setScopeId} from'./scoped';

export interface IntactComponentOptions extends ComponentOptions {
    Component: typeof Component
}

type SetupState = {
    instance: Component | null
}

type VNodeComponentClassMaybeWithVueInstance = VNodeComponentClass<ComponentClass> & {
    _vueInstance?: ComponentPublicInstance
}

export class Component<P = {}> extends IntactComponent<P> {
    static __cache: IntactComponentOptions | null = null;

    static get __vccOpts(): IntactComponentOptions {
        const Ctor = this as typeof Component;
        if (Ctor.__cache) {
            return Ctor.__cache;
        }

        return (Ctor.__cache = {
            name: Component.displayName || Component.name,
            Component: Ctor,

            setup(props, setupContext) {
                const setupState: SetupState = {instance: null};
                const proxy = new Proxy(setupState, {
                    get({instance}, key: keyof Component | '__v_isReactive' | 'instance') {
                        if (key === '__v_isReactive') return true;
                        if (instance === null) return null;
                        if (key === 'instance') return instance;

                        const value = instance[key];
                        if (isFunction(value)) {
                            // should bind instance, otherwise the `this` may point to proxyToUse
                            return value.bind(instance);
                        }
                        return value;
                    },

                    set(setupState, key, value) {
                        if (key === 'instance') {
                            return Reflect.set(setupState, key, value);
                        }
                        return Reflect.set(setupState.instance!, key, value);
                    },

                    getOwnPropertyDescriptor() {
                        return {
                            value: undefined,
                            writable: true,
                            enumerable: true,
                            configurable: true,
                        };
                    },

                    ownKeys() {
                        return [];
                    }
                });

                return proxy;
            },

            render(proxyToUse: ComponentPublicInstance, renderCache: any, props: any, setupState: SetupState) {
                const vueInstance = proxyToUse.$;
                const vNode = normalize(vueInstance.vnode) as VNodeComponentClassMaybeWithVueInstance;

                const _setScopeId = (element: IntactDom) => {
                    const vnode = vueInstance.vnode;
                    setScopeId(element, vnode, vnode.scopeId, (vnode as any).slotScopeIds, vueInstance.parent);
                }

                let instance = setupState.instance;
                const isInit = !instance;

                if (isInit) {
                    const mountedQueue: Function[] = [];
                    vNode._vueInstance = proxyToUse;

                    mount(vNode, null, null, false, null, []);
                    instance = setupState.instance = vNode.children as Component;
                    instance.isVue = true;

                    // hack the nodeOps of Vue to create the real dom instead of a comment
                    const element = findDomFromVNode(vNode, true) as IntactDom;
                    const documentCreateComment = document.createComment;
                    document.createComment = () => {
                        document.createComment = documentCreateComment;
                        return element as Comment;
                    };

                    // scope id
                    _setScopeId(element);
                } else {
                    const lastVNode = instance!.$vNode;
                    patch(lastVNode, vNode, this.$el.parentElement!, null, false, null, [], false);
                    // element may have chagned
                    const element = findDomFromVNode(vNode, true) as IntactDom;
                    const subTree = vueInstance.subTree;
                    if (subTree.el !== element) {
                        subTree.el = element;
                        // set scope id
                        _setScopeId(element);
                    }
                }

                return createVNode(Comment);
            },

            beforeUnmount() {
                // we should get name by instance, if the name starts with '$'
                unmount(this.instance.$vNode); 
            },
        });
    };

    static functionalWrapper = functionalWrapper;
    static normalize = normalizeChildren;

    // private element: IntactDom | null = null;
    public vueInstance: ComponentPublicInstance | undefined;
    private isVue: boolean = false;

    // for Vue infers types
    public $props!: P;

    constructor(
        props: Props<P, Component<P>> | null | undefined,
        $vNode: VNodeComponentClassMaybeWithVueInstance,
        $SVG: boolean,
        $mountedQueue: Function[],
        $parent: ComponentClass | null
    ) {
        super(props as any, $vNode, $SVG, $mountedQueue, $parent);
        this.vueInstance = $vNode._vueInstance;
        // disable async component 
        this.$inited = true;
    }
} 
