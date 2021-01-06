import {render} from 'vue';

export default class Wrapper {
    init(lastVNode, nextVNode) {
        // let the component destroy by itself
        this.destroyed = true;
        // this._addProps(nextVNode);

        // return patch(null, nextVNode.props.vueVNode, false, false, this.parentDom);
        const vueVNode = nextVNode.props.vueVNode;
        render(vueVNode, this.parentDom);
        return vueVNode.el;
    }

    update(lastVNode, nextVNode) {
        console.log('update')
        // this._addProps(nextVNode);
        // return patch(lastVNode.props.vueVNode, nextVNode.props.vueVNode, false, false, this.parentDom);
    }

    destroy(vNode) {
        // patch(vNode.props.vueVNode, null);
    }

    // maybe the props has been changed, so we change the vueVNode's data
    _addProps(vNode) {
        // for Intact reusing the dom
        this.vdt = {vNode};
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

