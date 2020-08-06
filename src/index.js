import Vue from 'vue';
// for webpack alias Intact to IntactVue
import Intact from 'intact/dist';
import {
    normalizeChildren,
    normalize,
    getChildrenAndBlocks,
    functionalWrapper
} from './utils';

const {init, $nextTick, _updateFromParent} = Vue.prototype;
const extend = Intact.utils.extend;

let activeInstance;
let mountedQueue;

export default class IntactVue extends Intact {
    static cid = 'IntactVue';

    static options = extend({}, Vue.options);

    static functionalWrapper = functionalWrapper;

    static normalize = normalizeChildren;

    constructor(options) {
        const parentVNode = options && options._parentVnode;
        if (parentVNode) {
            const vNode = normalize(parentVNode);
            super(vNode.props);

            // inject hook
            // if exist mountedQueue, it indicate that the component is nested into vue element
            // we call __patch__ to render it, and it will lead to call mounted hooks
            // but this component has not been appended
            // so we do it nextTick
            // options.mounted = [
                // activeInstance ?
                // () => {
                    // this.$nextTick(this.mount);
                // } :
                // this.mount
            // ];

            // force vue update intact component
            options._renderChildren = true;

            this.$options = options;
            this.$vnode = parentVNode;
            this._isVue = true;

            // for compitibility of vue@2.6
            this.$scopedSlots = {$stable: true};

            this.vNode = vNode;
            vNode.children = this;

            // for devtools
            const parent = options.parent;
            if (parent) {
                this.$parent = parent;
                this.$root = parent.$root;
                parent.$children.push(this);
            }
            this.$children = [];
            this._data = this.props;
            this.$refs = {};
            this._uid = this.uniqueId;
            options.name = this.displayName || this.constructor.name;
        } else {
            super(options);
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
        this.$vnode.elm = element;

        return element;
    }

    $mount(el, hydrating) {
        const oldTriggerFlag = this._shouldTrigger;
        this.__initMountedQueue();

        this.parentVNode = this.vNode.parentVNode = activeInstance && activeInstance.vNode;
        // disable intact async component
        this.inited = true;
        this.$el = this.init(null, this.vNode);
        this.vNode.dom = this.$el;
        this._vnode = {};
        const options = this.$options;
        const refElm = options._refElm;
        const parentElm = options._parentElm;
        // vue@2.5.18 and above does not need append the dom
        // vue will do this by itself
        if (parentElm) {
            if (refElm) {
                parentElm.insertBefore(this.$el, refElm);
            } else {
                parentElm.appendChild(this.$el);
            }
        }

        this.$el.__vue__ = this;

        this.mountedQueue.push(() => {
            this.mount();
        });

        this.__triggerMountedQueue();
        this._shouldTrigger = oldTriggerFlag;
    }

    $forceUpdate() {
        const oldTriggerFlag = this._shouldTrigger;
        this.__initMountedQueue();

        const vNode = normalize(this.$vnode);
        const lastVNode = this.vNode;
        vNode.children = this;

        this.vNode = vNode;
        this.parentVNode = this.vNode.parentVNode = activeInstance && activeInstance.vNode;
        // Intact can change element when update, so we should re-assign it to elm, #4
        this.$vnode.elm = this.update(lastVNode, vNode);

        // force vue update intact component
        // reset it, because vue may set it to undefined
        this.$options._renderChildren = true;

        // let the vNode patchable for vue to register ref
        // this._vnode = this.vdt.vNode;
        // don't let vue to register ref, it will change className and so on
        // handle it there
        const lastRef = lastVNode.ref;
        const nextRef = vNode.ref;
        if (lastRef !== nextRef &&
            // if the string of the key is the same, do nothing
            !(lastRef && nextRef && lastRef.key === nextRef.key)
        ) {
            if (lastRef) {
                lastRef(this, true);
            }
            if (nextRef) {
                nextRef(this);
            }
        }

        this.__triggerMountedQueue();
        this._shouldTrigger = oldTriggerFlag;
    }

    $destroy() {
        delete this.$el.__vue__;
        const parent = this.$parent;
        if (parent) {
            const children = parent.$children;
            if (children.length) {
                const index = children.indexOf(this);
                if (~index) {
                    children.splice(index, 1);
                }
            }
        }
        this.destroy();
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
            if (this.mounted) {
                this._triggerMountedQueue();
            } else {
                // vue will call mouted hook after append the element
                // so we push to the queue to make it to be called immediately
                this.$options.mounted = [
                    this._triggerMountedQueue
                ];
                // this.$nextTick(() => {
                    // if (this.destroyed) return;
                    // this._triggerMountedQueue();
                // });
            }
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

    // mock api
    $on() {}
    $off() {}
}

IntactVue.prototype.$nextTick = $nextTick;
// for vue@2.1.8
IntactVue.prototype._updateFromParent = _updateFromParent;

// for compatibilty of IE <= 10
if (!Object.setPrototypeOf) {
    extend(IntactVue, Intact);
    // for Intact <= 2.4.4
    if (!IntactVue.template) {
        IntactVue.template = Intact.template;
    }
}
