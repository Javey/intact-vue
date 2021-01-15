import {createApp, h, getCurrentInstance, KeepAlive, cloneVNode} from 'vue';
import {isIntactComponent, cid, noop} from './utils';

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

const ignorePropRegExp = /_ev[A-Z]/;

export default class Wrapper {
    init(lastVNode, nextVNode) {
        // let the component destroy by itself
        this.destroyed = true;
        this._addProps(nextVNode);

        const vueVNode = nextVNode.props.vueVNode;
        const parentDom = this.parentDom || document.createDocumentFragment();
        patch(null, vueVNode, parentDom, null, getParentComponent(nextVNode));

        return vueVNode.el;
    }

    update(lastVNode, nextVNode) {
        this._addProps(nextVNode);
        const vueVNode = nextVNode.props.vueVNode;
        // render(vueVNode, this.container);
        patch(lastVNode.props.vueVNode, vueVNode, this.parentDom, null, getParentComponent(nextVNode));
        return vueVNode.el;
    }

    destroy(vNode) {
        // if we wrap a Intact functional component which return a Inact component,
        // the dom will be a comment node that will be replaced by InactVue,
        // in this case we set _unmount to let Inact never remove it,
        // and set doRemove to true to let Vue remove it instead.
        const vueVNode = vNode.props.vueVNode;
        let doRemove = false;
        if (vueVNode.type.cid === cid) {
            vNode.dom._unmount = noop;
            doRemove = true;
        }
        unmount(vNode.props.vueVNode, null, null, doRemove);
    }

    // maybe the props has been changed, so we change the vueVNode's data
    _addProps(vNode) {
        // for Intact reusing the dom
        this.vdt = {vNode};
        const props = vNode.props;
        let vueVNode = props.vueVNode;
        // if we reuse the vNode, clone it
        if (vueVNode.el) {
            vueVNode = cloneVNode(vueVNode);
        }
        let shouldAssign = true;
        for (let key in props) {
            if (key === 'vueVNode') continue;
            if (ignorePropRegExp.test(key)) continue;
            let vueProps = vueVNode.props;
            if (shouldAssign) {
                // props may be a EMPTY_OBJ, but we can not get its reference,
                // so we use a flag to handle it
                vueProps = vueVNode.props = {...vueVNode.props};
                shouldAssign = false;
                // should change patchFlag to let Vue full diff props
                vueVNode.patchFlag |= 16;
            }
            const prop = props[key];
            // is event
            if (key === 'className') {
                vueProps.class = prop;
            } else if (key === 'style') {
                vueProps.style = {...vueProps.style, ...prop};
            } else if (key.substr(0, 3) === 'ev-') {
                const name = key.substr(3);
                vueProps[`on` + name[0].toUpperCase() + name.substr(1)] = prop;
            } else {
                vueProps[key] = prop;
            }
        }

        vNode.props = {...props, vueVNode};
    }
}

function getParentComponent(vNode) {
    let parentVNode = vNode.parentVNode;
    while (parentVNode) {
        const children = parentVNode.children;
        if (children && children.vueInstance) {
            return children.vueInstance.$parent.$;
        }
        parentVNode = parentVNode.parentVNode;
    }
}
