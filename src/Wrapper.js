import {createApp, h, render, getCurrentInstance, KeepAlive} from 'vue';

// we must use this hack method to get patch function
let internals;
createApp({
    render() {
        return h(KeepAlive, null, h(function() {
            const instance = getCurrentInstance();
            internals = instance.parent.ctx.renderer;
        }));
    }
}).mount(document.createElement('div'));
const {p: patch, um: unmount} = internals;

export default class Wrapper {
    init(lastVNode, nextVNode) {
        // let the component destroy by itself
        this.destroyed = true;
        this._addProps(nextVNode);

        const vueVNode = nextVNode.props.vueVNode;
        const parentDom = this.parentDom || document.createDocumentFragment();
        // const container = this.container = document.createDocumentFragment();
        // render(vueVNode, container);
        patch(null, vueVNode, parentDom, null);
        return vueVNode.el;
    }

    update(lastVNode, nextVNode) {
        this._addProps(nextVNode);
        const vueVNode = nextVNode.props.vueVNode;
        // render(vueVNode, this.container);
        patch(lastVNode.props.vueVNode, vueVNode, this.parentDom, null);
        return vueVNode.el;
    }

    destroy(vNode) {
        unmount(vNode.props.vueVNode, null, null, false);
        // render will doRemove in Vue, but Intact may repalce child with the dom
        // so we hack the parentNode to let Vue does not remove the child
        // const vueNode = vNode.props.vueVNode;
        // const child = vueNode.el;
        // const parentNode = child.parentNode;
        // let lock = true;
        // Object.defineProperty(child, 'parentNode', {
            // get() {
                // if (lock) return null;
                // return child.parentElement;
            // }
        // });
        // render(null, this.container);
        // lock = false;
    }

    // maybe the props has been changed, so we change the vueVNode's data
    _addProps(vNode) {
        // for Intact reusing the dom
        this.vdt = {vNode};
        return;
        const props = vNode.props;
        let vueVNode = props.vueVNode;
        // if we reuse the vNode, clone it
        if (vueVNode.elm) {
            vueVNode = cloneVNode(vueVNode);
        }
        for (let key in props) {
            if (key === 'vueVNode') continue;
            if (ignorePropRegExp.test(key)) continue;
            if (!vueVNode.data) vueVNode.data = {};
            const data = vueVNode.data;
            const prop = props[key];
            // is event
            if (key === 'className') {
                data.staticClass = prop;
                delete data.class;
            } else if (key === 'style') {
                if (data.staticStyle) {
                    data.staticStyle = {...data.staticStyle, ...prop};
                } else {
                    data.staticStyle = prop;
                }
            } else if (key.substr(0, 3) === 'ev-') {
                if (!data.on) data.on = {};
                data.on[key.substr(3)] = prop;
            } else {
                if (!data.attrs) data.attrs = {};
                data.attrs[key] = prop;
            }
        }

        vNode.props = {...props, vueVNode};
    }
}

function getParentComponent(instance) {
    let parent = instance.parent;

}
