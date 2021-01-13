import Intact from 'intact/dist';

const {hooks} = Intact.Vdt.miss;

if (hooks) {
    hooks.beforeInsert = function(vNode) {
        const dom = vNode.dom;
        let parent = vNode.parentVNode;
        let i;
        while (parent) {
            // find Intact Component which renders by Vue
            if (
                (i = parent.tag) &&
                (i.cid === 'IntactVue') &&
                (i = parent.children.vueInstance)
            ) {
                const vnode = i.$.vnode;
                const parentComponent = i.$parent.$;
                setScopeId(dom, vnode.scopeId, vnode, parentComponent);
                break;
            } else {
                parent = parent.parentVNode;
            }
        }
    }
}

function setScopeId(el, scopeId, vnode, parentComponent) {
    if (scopeId) {
        hostSetScopeId(el, scopeId);
    }
    if (parentComponent) {
        const treeOwnerId = parentComponent.type.__scopeId;
        // vnode's own scopeId and the current patched component's scopeId is
        // different - this is a slot content node.
        if (treeOwnerId && treeOwnerId !== scopeId) {
            hostSetScopeId(el, treeOwnerId + '-s');
        }
        let subTree = parentComponent.subTree;
        if (vnode === subTree) {
            setScopeId(el, parentComponent.vnode.scopeId, parentComponent.vnode, parentComponent.parent);
        }
    }
}

function hostSetScopeId(el, scopeId) {
    el.setAttribute(scopeId, '');
}
