import Intact from 'intact/dist';
import {Comment, createVNode, getCurrentInstance} from 'vue';
import {normalize, normalizeChildren} from './normalize';
import {enableTracking, resetTracking} from '@vue/reactivity';
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
            Component,
            setup(props, ctx) {
                const vueInstance = getCurrentInstance();

                enableTracking();
                const vNode = normalize(vueInstance.vnode);
                resetTracking();

                const instance = new Component(vNode.props);
                instance.vNode = vNode;
                instance._isVue = true;
                vNode.children = instance;

                const setupState = {instance};
                const proxy = new Proxy(setupState, {
                    get({instance}, key) {
                        if (key === '__v_isReactive') return true;
                        return instance[key];
                    },

                    set({instance}, key, value) {
                        return Reflect.set(instance, key, value);
                    },

                    getOwnPropertyDescriptor({instance}, key) {
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

            render() {
                return createVNode(Comment, null, 'intact-vue-placeholer');
            },

            beforeMount() {
                this.vueInstance = this;

                this.__initMountedQueue();

                this.parentVNode = this.vNode.parentVNode = activeInstance && activeInstance.vNode;
                // disable intact async component
                this.inited = true;
                this.vNode.dom = this.init(null, this.vNode);

                this.mountedQueue.push(() => {
                    this.mount();
                });
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

            beforeUpdate() {
                this.vueInstance = this;

                // If we trigger a update in a update lifecyle,
                // the updated hook will add multipe times,
                // but Vue will dedup the pendingPostFlushCbs.
                // We add a flag `__updating` to indicate the component is updating
                // and don't add the `pendingCount`.
                this.__initMountedQueue();
                this.__updating = true;

                enableTracking();
                const vNode = normalize(this.$.vnode);
                resetTracking();

                const lastVNode = this.vNode;
                vNode.children = this;

                this.vNode = vNode;
                this.parentVNode = this.vNode.parentVNode = activeInstance && activeInstance.vNode;

                this.vNode.dom = this.update(lastVNode, vNode);
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
