import Intact from 'intact/dist';
import {Comment, createVNode} from 'vue';
import {normalize, normalizeChildren} from './normalize';
import functionalWrapper from './functionWrapper';
import {cid} from './utils';
import './scopeId';

let activeInstance;
let mountedQueue;
let pendingCount = 0;

export default class IntactVue extends Intact {
    static functionalWrapper = functionalWrapper;
    static normalize = normalizeChildren;
    static cid = cid;

    static get __vccOpts() {
        const Component = this;
        if (Component.hasOwnProperty('__cache')) {
            return Component.__cache;
        }

        return Component.__cache = {
            // for debug
            name: Component.displayName || Component.name,

            Component,
            setup(props, ctx) {
                const setupState = {instance: null};
                const proxy = new Proxy(setupState, {
                    get({instance}, key) {
                        if (key === '__v_isReactive') return true;
                        if (!instance) return null;
                        if (key === 'instance') return instance;
                        return instance[key];
                    },

                    set(setupState, key, value) {
                        if (key === 'instance') return Reflect.set(setupState, key, value);
                        return Reflect.set(setupState.instance, key, value);
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

            render(proxyToUse, renderCache, props, setupState, data, ctx) {
                const vueInstance = proxyToUse.$;
                const vNode = normalize(vueInstance.vnode);

                let instance = setupState.instance;
                let isInit = false;
                if (!instance) {
                    isInit = true;
                    instance = setupState.instance = new Component(vNode.props);
                    instance._isVue = true;
                }

                vNode.children = instance;

                instance.vueInstance = proxyToUse;
                instance.parentVNode = vNode.parentVNode = activeInstance && activeInstance.vNode;

                const lastVNode = instance.vNode;
                instance.vNode = vNode;

                instance.__initMountedQueue();

                if (isInit) {
                    // disable intact async component
                    instance.inited = true;
                    vNode.dom = instance.init(null, vNode);

                    instance.mountedQueue.push(() => {
                        instance.mount();
                    });
                } else {
                    instance.__updating = true;
                    vNode.dom = instance.update(lastVNode, vNode);
                }

                return createVNode(Comment, null, 'intact-vue-placeholer');
            },

            mounted() {
                const el = this.$el;
                const dom = this.element;
                el.parentNode.replaceChild(dom, el);

                // update vnode.el
                this._updateVNodeEl();

                // If we trigger a update in a update lifecyle,
                // the order of hooks is beforeMount -> beforeUpdate -> mountd -> updated,
                // in this case, we should not updateVNodeEl in beforeUpdated,
                // so we add a flag to skip it
                this._hasCalledMountd = true;

                this.__triggerMountedQueue();
            },

            updated() {
                this.__updating = false;
                this.__triggerMountedQueue();
            },

            beforeUnmount() {
                this.destroy();
            }
        }
    }

    init(lastVNode, nextVNode) {
        pushActiveInstance(this);
        var element = super.init(lastVNode, nextVNode);
        popActiveInstance();

        return element;
    }

    update(lastVNode, nextVNode, fromPending) {
        const update = () => {
            pushActiveInstance(this);
            const element = super.update(lastVNode, nextVNode, fromPending);
            popActiveInstance();

            return element;
        };

        if (!this._isVue) return update();

        const element = update();

        // should update vnode.el, becasue Intact may change dom after it updated
        if (this._hasCalledMountd) {
            this._updateVNodeEl();
        }

        return element;
    }

    // we should promise that all intact components have been mounted
    __initMountedQueue() {
        if (!this.__updating) {
            ++pendingCount;
        }
        if (!mountedQueue || mountedQueue.done) {
            if (!this.mountedQueue || this.mountedQueue.done) {
                this._initMountedQueue();
            }
            mountedQueue = this.mountedQueue;
        } else {
            this.mountedQueue = mountedQueue;
        }
    }

    __triggerMountedQueue() {
        if (!--pendingCount) {
            this._triggerMountedQueue();
            mountedQueue = null;
        }
    }

    _updateVNodeEl() {
        const element = this.element;
        let vueInstance = this.vueInstance.$;
        let vnode;
        do {
            vnode = vueInstance.vnode;
            vueInstance.subTree.el = vnode.el = element;
            vueInstance = vueInstance.parent;
        } while (vueInstance && vueInstance.subTree === vnode);
    }
}

const stack = [];
let index = -1;
function pushActiveInstance(instance) {
    stack.push(instance);
    index++;
    activeInstance = instance;
}

function popActiveInstance() {
    stack.pop();
    index--;
    activeInstance = stack[index];
}
