import Vue from 'vue';
// for webpack alias Intact to IntactVue
import Intact from 'intact/dist/intact';
import {
    normalizeChildren,
    attachProps,
    MockVueComponent
} from './utils';

const init = Vue.prototype._init;

export default class IntactVue extends Intact {
    static cid = 'IntactVue';

    static options = Object.assign({}, Vue.options);

	constructor(options) {
        const parentVNode = options._parentVnode;
        if (parentVNode) {
            super(attachProps(parentVNode));

            // get slots
            const vm = new MockVueComponent();
            init.call(vm, options);
            this.$slots = vm.$slots;
            this._handleSlots();
            this._isVue = vm._isVue

            // inject hook
            options.mounted = [this.mount];

            this.$options = options;
            this.$vnode = parentVNode; 

            this.$lastVNode = parentVNode; 
            this.parentVNode = parentVNode;
        } else {
            super(options);
        }
	}

	$mount(el, hydrating) {
		this.$el = this.init();
		this._vnode = {};
		this.$options._parentElm.appendChild(this.$el);
	}

	$forceUpdate() {
        this._initMountedQueue();
        attachProps(this.$vnode);
        this._handleSlots();
		this.update(this.$lastVNode, this.$vnode);
        this.$lastVNode = this.$vnode;
        this.parentVNode = this.$vnode;
        this._triggerMountedQueue();
	}

	$destroy() {
		this.destroy();
	}

    _handleSlots() {
        const {default: d, ...rest} = this.$slots;
        let blocks;
        if (rest) {
            blocks = {};
            for (const key in rest) {
                blocks[key] = function() {
                    return normalizeChildren(rest[key]);
                }
            }
        }
        this.set({
            children: normalizeChildren(d),
            _blocks: blocks,
        }, {update: false});
    }
}
