import Vue from 'vue';
// for webpack alias Intact to IntactVue
import Intact from 'intact/dist/intact';
import {
    normalizeChildren,
    normalize,
    getChildrenAndBlocks,
    functionalWrapper
} from './utils';

const {init, $nextTick} = Vue.prototype;

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

            this.$options = options;
            this.$vnode = parentVNode; 
            this._isVue = true;

            this.parentVNode = vNode;
            vNode.children = this;
        } else {
            super(options);
        }
    }

    $mount(el, hydrating) {
        this.$el = this.init(null, this.parentVNode);
        this._vnode = {};
        const options = this.$options;
        const refElm = options._refElm;
        if (refElm) {
            options._parentElm.replaceChild(this.$el, refElm);
        } else {
            options._parentElm.appendChild(this.$el);
        }
    }

    $forceUpdate() {
        this._initMountedQueue();

        const vNode = normalize(this.$vnode);
        vNode.children = this;

        this.update(this.parentVNode, vNode);
        this.parentVNode = vNode;

        this._triggerMountedQueue();
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
