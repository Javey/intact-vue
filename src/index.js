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

let activeInstance;

export default class IntactVue extends Intact {
    static cid = 'IntactVue';

    static options = Object.assign({}, Vue.options);

    static functionalWrapper = functionalWrapper;

    static normalize = normalizeChildren;

    constructor(options) {
        const parentVNode = options && options._parentVnode;
        if (parentVNode) {
            const vNode = normalize(parentVNode);
            vNode.parentVNode = activeInstance && activeInstance.vNode;
            super(vNode.props);

            // inject hook
            options.mounted = [this.mount];
            // force vue update intact component
            options._renderChildren = true;

            this.$options = options;
            this.$vnode = parentVNode; 
            this._isVue = true;

            this.vNode = vNode;
            this.parentVNode = vNode.parentVNode;
            vNode.children = this;
        } else {
            super(options);
        }
    }

    $mount(el, hydrating) {
        const preActiveInstance = activeInstance;
        this._initMountedQueue();
        activeInstance = this;

        this.$el = this.init(null, this.vNode);
        this._vnode = {};
        const options = this.$options;
        const refElm = options._refElm;
        if (refElm) {
            options._parentElm.replaceChild(this.$el, refElm);
        } else {
            options._parentElm.appendChild(this.$el);
        }

        this._triggerMountedQueue();
        activeInstance = preActiveInstance;
    }

    $forceUpdate() {
        const preActiveInstance = activeInstance;
        this._initMountedQueue();
        activeInstance = this;

        const vNode = normalize(this.$vnode);
        vNode.children = this;

        this.update(this.vNode, vNode);
        this.vNode = vNode;
        this.parentVNode = preActiveInstance && preActiveInstance.vNode;

        // force vue update intact component
        // reset it, because vue may set it to undefined
        this.$options._renderChildren = true;

        // let the vNode patchable for vue to register ref
        this._vnode = this.vdt.vNode;

        this._triggerMountedQueue();
        activeInstance = preActiveInstance;
    }

    $destroy() {
        this.destroy();
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
