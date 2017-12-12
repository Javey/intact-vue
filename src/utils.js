import Intact from 'intact/dist/intact';
import Vue from 'vue';

const h = Intact.Vdt.miss.h;
const patch = Vue.prototype.__patch__;

export function normalizeChildren(vNodes) {
	if (vNodes) {
		const ret = [];
		vNodes.forEach(vNode => {
            if (isIntactComponent(vNode)) {
                const options = vNode.componentOptions;
                vNode = h(
                    options.Ctor,
                    Object.assign({className: className(vNode)}, vNode.data.attrs),
                    normalizeChildren(options.children),
                    null,
                    vNode.key,
                    vNode.ref
                );
            } else {
                vNode = h(Wrapper, {vueVNode: vNode});
            }
			ret.push(vNode);
		});
		return ret;
	}
	return vNodes;
}

export function attachProps(vNode) {
    const componentOptions = vNode.componentOptions;
    const data = vNode.data;
    const props = Object.assign({
        // children: normalizeChildren(componentOptions.children)
    }, data.attrs);

    // if exists v-model
    if (data.model) {
        props.value = data.model.value;
    }

    for (let key in componentOptions.listeners) {
        // is a v-model directive of vue
        if (key === 'input') {
            props[`ev-$change:value`] = function(c, v) {
                componentOptions.listeners.input(v);
            }
        } else {
            props[`ev-${key}`] = componentOptions.listeners[key];
        }
    }

    vNode.props = props;

    return props;
}

export class MockVueComponent {
    static options = Vue.options;
    // mock api
    $on() {}
}

class Wrapper {
	init(lastVNode, nextVNode) {
        return patch(null, nextVNode.props.vueVNode);
	}

	update(lastVNode, nextVNode) {
        return patch(lastVNode.props.vueVNode, nextVNode.props.vueVNode);
	}

    destroy(vNode) {
        patch(vNode.props.vueVNode, null);
    }
}

function className(vNode) {
    let className;
    let data = vNode.data;
    if (data) {
        if (data.staticClass) {
            if (!className) className = data.staticClass;
        }
        if (data.class) {
            if (!className) {
                className = data.class;
            } else {
                className += ' ' + data.class;
            }
        }
    }

    return className;
}

function isIntactComponent(vNode) {
	let i = vNode.data;
	return i && (i = i.hook) && (i = i.init) &&
        vNode.componentOptions.Ctor.cid === 'IntactVue';
}
