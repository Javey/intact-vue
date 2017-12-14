import Vue from 'vue';
// for webpack alias Intact to IntactVue
import Intact from 'intact/dist/intact';
import {
    normalizeChildren,
    normalize,
    getChildrenAndBlocks,
    MockVueComponent,
    functionalWrapper
} from './utils';

const init = Vue.prototype._init;

export default class IntactVue extends Intact {
    static cid = 'IntactVue';

    static options = Object.assign({}, Vue.options);

    static functionalWrapper = functionalWrapper;

    constructor(options) {
        const parentVNode = options && options._parentVnode;
        if (parentVNode) {
            const vNode = normalize(parentVNode);
            super(vNode.props);

            // inject hook
            options.mounted = [this.mount];

            this.$options = options;
            this.$vnode = parentVNode; 

            this.parentVNode = vNode;
            vNode.children = this;
        } else {
            super(options);
        }
    }

    $mount(el, hydrating) {
        this.$el = this.init(null, this.parentVNode);
        this._vnode = {};
        this.$options._parentElm.appendChild(this.$el);
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

    // mock api
    $on() {}
    $off() {}
}
