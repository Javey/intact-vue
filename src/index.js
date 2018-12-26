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
            options.mounted = [activeInstance ? 
                () => {
                    this.$nextTick(this.mount);
                } :
                this.mount
            ];

            // force vue update intact component
            options._renderChildren = true;

            this.$options = options;
            this.$vnode = parentVNode; 
            this._isVue = true;

            this.vNode = vNode;
            vNode.children = this;
        } else {
            super(options);
        }
        this._prevActiveInstance = activeInstance;
        activeInstance = this;
    }

    init(lastVNode, nextVNode) {
        const init = () => {
            var element = super.init(lastVNode, nextVNode);
            activeInstance = this._prevActiveInstance;
            this._prevActiveInstance = null;

            return element;
        };

        if (!this._isVue) return init();

        mountedQueue = this.mountedQueue;

        const element = init();

        return element;
    }

    update(lastVNode, nextVNode, fromPending) {
        const update = () => {
            this._prevActiveInstance = activeInstance;
            activeInstance = this;
            const element = super.update(lastVNode, nextVNode, fromPending);
            activeInstance = this._prevActiveInstance;
            this._prevActiveInstance = null;

            return element;
        };

        if (!this._isVue) return update(); 

        // maybe update in updating
        const oldTriggerFlag = this._shouldTrigger;
        this.__initMountedQueue();
        
        const element = update();

        this.__triggerMountedQueue();
        this._shouldTrigger = oldTriggerFlag;

        return element;
    }

    $mount(el, hydrating) {
        const oldTriggerFlag = this._shouldTrigger;
        this.__initMountedQueue();

        this.parentVNode = this.vNode.parentVNode = this._prevActiveInstance && this._prevActiveInstance.vNode;
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

        this.__triggerMountedQueue();
        this._shouldTrigger = oldTriggerFlag;
        activeInstance = this._prevActiveInstance;
        this._prevActiveInstance = null;
    }

    $forceUpdate() {
        const oldTriggerFlag = this._shouldTrigger;
        this.__initMountedQueue();

        this._prevActiveInstance = activeInstance;
        activeInstance = this;

        const vNode = normalize(this.$vnode);
        const lastVNode = this.vNode;
        vNode.children = this;

        this.vNode = vNode;
        this.parentVNode = this.vNode.parentVNode = this._prevActiveInstance && this._prevActiveInstance.vNode;
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
        if (lastRef !== nextRef) {
            if (lastRef) {
                lastRef(null);
            }
            if (nextRef) {
                nextRef(this);
            }
        }

        this.__triggerMountedQueue();
        this._shouldTrigger = oldTriggerFlag;

        activeInstance = this._prevActiveInstance;
        this._prevActiveInstance = null;
    }

    $destroy() {
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
                this.$options.mounted.push(() => {
                    this._triggerMountedQueue();
                });
                // this.$nextTick(() => {
                    // if (this.destroyed) return;
                    // this._triggerMountedQueue();
                // });
            }
            mountedQueue = null;
            this._shouldTrigger = false;
        }
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
