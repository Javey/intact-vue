import Intact from 'intact/dist';
import {Comment, createVNode, getCurrentInstance, inject} from 'vue';
import {createVNodeBySetupContext, normalize, normalizeChildren} from './normalize';
import {enableTracking, resetTracking} from '@vue/reactivity';
import functionalWrapper from './functionWrapper';

let activeInstance;
let mountedQueue;

export default class IntactVue extends Intact {
    static functionalWrapper = functionalWrapper;
    static normalize = normalizeChildren;

    static get __vccOpts() {
        const Component = this;
        if (Component.__cache) {
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
                        // console.log('get', key);
                        if (key === '__v_isReactive') return true;
                        return instance[key];
                    },

                    set({instance}, key, value) {
                        // console.log('set', key);
                        return Reflect.set(instance, key, value);
                    },

                    getOwnPropertyDescriptor({instance}, key) {
                        // console.log('hasOwn', key);
                        return {
                            value: undefined,
                            writable: true,
                            enumerable: true,
                            configurable: true,
                        };
                    },

                    ownKeys() {
                        // console.log('Object.keys()');
                        return [];
                    }
                });
                return proxy;
            },

            render() {
                return createVNode(Comment, null, 'intact-vue-placeholer');
            },

            beforeMount() {
                this._oldTriggerFlag = this._shouldTrigger;
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
                let vueInstance = this.$;
                let vnode;
                do {
                    vnode = vueInstance.vnode;
                    vueInstance.subTree.el = vnode.el = dom;
                    vueInstance = vueInstance.parent;
                } while (vueInstance && vueInstance.subTree === vnode);

                this.__triggerMountedQueue();
                this._shouldTrigger = this._oldTriggerFlag;
            },

            beforeUpdate() {
                const oldTriggerFlag = this._shouldTrigger;
                this.__initMountedQueue();

                const vNode = normalize(this.$.vnode);
                const lastVNode = this.vNode;
                vNode.children = this;

                this.vNode = vNode;
                this.parentVNode = this.vNode.parentVNode = activeInstance && activeInstance.vNode;

                this.vNode.dom = this.update(lastVNode, vNode);
            },

            updated() {
                this.__triggerMountedQueue();
                this._shouldTrigger = this._oldTriggerFlag;
            }
        }
    }

    // _constructor(props) {
        // this._pendingEmitQueue = [];
        // super._constructor(props);
    // }

    init(lastVNode, nextVNode) {
        const init = () => {
            this.__pushActiveInstance();
            var element = super.init(lastVNode, nextVNode);
            this.__popActiveInstance();

            return element;
        };

        if (!this._isVue) return init();

        mountedQueue = this.mountedQueue;

        const element = init();

        return element;
    }

    update(lastVNode, nextVNode, fromPending) {
        const update = () => {
            this.__pushActiveInstance();
            const element = super.update(lastVNode, nextVNode, fromPending);
            this.__popActiveInstance();

            return element;
        };

        if (!this._isVue) return update();

        // maybe update in updating
        const oldTriggerFlag = this._shouldTrigger;
        this.__initMountedQueue();

        const element = update();

        this.__triggerMountedQueue();
        this._shouldTrigger = oldTriggerFlag;

        // should update elm of vnode of Vue to let Vue hanlde dom correctly
        // this.$vnode.elm = element;

        return element;
    }

    // trigger(eventName, component, ...args) {
        // const changeEventPrefix = '$change:';
        // const length = changeEventPrefix.length;
        // if (eventName.substr(0, length) === changeEventPrefix) {
            // let propName = eventName.substr(length);
            // if (propName === 'value') propName = 'modelValue';
            // this._emit(`update:${propName}`, ...args);
        // }
        // this._emit(eventName, component, ...args);
        // super.trigger(eventName, component, ...args);
    // }

    // _emit(eventName, ...args) {
        // const vueInstance = this.vueInstance;
        // if (vueInstance) {
            // vueInstance.$emit(eventName, ...args);
        // } else {
            // this._pendingEmitQueue.push([eventName, args]);
        // }
    // }

    // _flushEmit() {
        // let item;
        // while (item = this._pendingEmitQueue.pop()) {
            // this.vueInstance.$emit(item[0], ...item[1]);
        // }
    // }

    // we should promise that all intact components have been mounted
    __initMountedQueue() {
        this._shouldTrigger = false;
        if (!mountedQueue || mountedQueue.done) {
            this._shouldTrigger = true;
            if (!this.mountedQueue || this.mountedQueue.done) {
                this._initMountedQueue();
            }
            mountedQueue = this.mountedQueue;
        } else {
            this.mountedQueue = mountedQueue;
        }
    }

    __triggerMountedQueue() {
        if (this._shouldTrigger) {
            // if (this.mounted) {
                this._triggerMountedQueue();
            // } else {
                // vue will call mouted hook after append the element
                // so we push to the queue to make it to be called immediately
                // this.$options.mounted = [
                    // this._triggerMountedQueue
                // ];
            // }
            mountedQueue = null;
            this._shouldTrigger = false;
        }
    }

    __pushActiveInstance() {
        this._prevActiveInstance = activeInstance;
        activeInstance = this;
    }

    __popActiveInstance() {
        activeInstance = this._prevActiveInstance;
        this._prevActiveInstance = null;
    }
}
