import Intact from 'intact/dist';
import {Comment, createVNode} from 'vue';
import {createVNodeBySetupContext} from './normalize';

let activeInstance;
let mountedQueue;

export default class IntactVue extends Intact {
    static get __vccOpts() {
        const Component = this;

        return {
            setup(props, ctx) {
                const vNode = createVNodeBySetupContext(Component, ctx);
                const instance = new Component(vNode.props);
                instance.vNode = vNode;
                instance._isVue = true;
                vNode.children = instance;
                return {instance};
            },

            render() {
                return createVNode(Comment, null, 'intact-vue-placeholer');
            },

            beforeMount() {
                const instance = this.instance;
                instance._oldTriggerFlag = instance._shouldTrigger;
                instance.__initMountedQueue();
                instance.parentVNode = instance.vNode.parentVNode = activeInstance && activeInstance.vNode;
                // disable intact async component
                instance.inited = true;
                instance.dom = instance.init(null, instance.vNode);
                instance.vNode.dom = instance.dom;
                instance.mountedQueue.push(() => {
                    instance.mount();
                });
            },


            mounted() {
                const instance = this.instance;
                const el = this.$el;
                const dom = instance.dom;
                el.parentElement.replaceChild(dom, el);

                // update vnode.el
                let vueInstance = this._;
                let vnode;
                do {
                    vnode = vueInstance.vnode;
                    vnode.el = dom;
                    vueInstance = vueInstance.parent;
                } while (vueInstance && vueInstance.subTree === vnode);

                instance.__triggerMountedQueue();
                instance._shouldTrigger = instance._oldTriggerFlag;
            }
        }
    }

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

export class IntactComponent extends IntactVue {
    static template = `<div ev-click={self.onClick}>{self.get('count')}</div>`;

    defaults() {
        return {
            count: 1
        }
    }

    onClick() {
        this.set('count', this.get('count') + 1);
    }
}
