import Vue from 'vue';
// for webpack alias Intact to IntactVue
import Intact from 'intact/dist/intact';
import {
    normalizeChildren,
    normalize,
    getChildrenAndBlocks,
    functionalWrapper
} from './utils';

const {init, $nextTick, _updateFromParent} = Vue.prototype;

let activeInstance = {};
let mountedQueue;
let ignoreMountedQueue = false;

export default class IntactVue extends Intact {
    static cid = 'IntactVue';

    static options = Object.assign({}, Vue.options);

    static functionalWrapper = functionalWrapper;

    static normalize = normalizeChildren;

    constructor(options) {
        const parentVNode = options && options._parentVnode;
        if (parentVNode) {
            const vNode = normalize(parentVNode);
            super(vNode.props);

            // inject hook
            options.mounted = [this.mount];
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

        const prevIgnoreMountedQueue = ignoreMountedQueue;
        if (!nextVNode) {
            ignoreMountedQueue = true;
        }
        if (!ignoreMountedQueue) {
            mountedQueue = this.mountedQueue;
        }

        const element = init();
        
        ignoreMountedQueue = prevIgnoreMountedQueue;

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

        const prevIgnoreMountedQueue = ignoreMountedQueue;
        if (!nextVNode && !fromPending && this._updateCount === 0) {
            ignoreMountedQueue = true;
        }
        if (!ignoreMountedQueue) {
            mountedQueue = this.mountedQueue;
        }

        const element = update();

        ignoreMountedQueue = prevIgnoreMountedQueue;

        return element;
    }

    $mount(el, hydrating) {
        this.__initMountedQueue();

        this.parentVNode = this.vNode.parentVNode = this._prevActiveInstance && this._prevActiveInstance.vNode;
        this.$el = super.init(null, this.vNode);
        this._vnode = {};
        const options = this.$options;
        const refElm = options._refElm;
        if (refElm) {
            options._parentElm.replaceChild(this.$el, refElm);
        } else {
            options._parentElm.appendChild(this.$el);
        }

        this.__triggerMountedQueue();
        activeInstance = this._prevActiveInstance;
        this._prevActiveInstance = null;
    }

    $forceUpdate() {
        this.__initMountedQueue();

        this._prevActiveInstance = activeInstance;
        activeInstance = this;

        const vNode = normalize(this.$vnode);
        const lastVNode = this.vNode;
        vNode.children = this;

        this.vNode = vNode;
        this.parentVNode = this.vNode.parentVNode = this._prevActiveInstance && this._prevActiveInstance.vNode;
        super.update(lastVNode, vNode);

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

        activeInstance = this._prevActiveInstance;
        this._prevActiveInstance = null;
    }

    $destroy() {
        this.destroy();
    }

    // we should promise that all intact components have been mounted
    __initMountedQueue() {
        this._shouldTrigger = false;
        if (!mountedQueue) {
            this._shouldTrigger = true;
            if (!this.mountedQueue) {
                super._initMountedQueue();
            }
            mountedQueue = this.mountedQueue;
        } else {
            this.mountedQueue = mountedQueue;
        }
    }

    __triggerMountedQueue() {
        if (this._shouldTrigger) {
            super._triggerMountedQueue();
            mountedQueue = null;
            this._shouldTrigger = false;
        }
    }

    // wrapp vm._c to return Intact vNode.
    // __c(...args) {
        // const vNode = vm._c(...args); 

    // }

    // mock api
    $on() {}
    $off() {}
}

IntactVue.prototype.$nextTick = $nextTick;
// for vue@2.1.8
IntactVue.prototype._updateFromParent = _updateFromParent;
