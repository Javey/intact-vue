'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib = require('tslib');
var intact = require('intact');
var vue = require('vue');
var intactShared = require('intact-shared');

// we must use this hack method to get patch function
var internals;
vue.createApp({
    render: function () {
        return vue.h(vue.KeepAlive, null, vue.h(function () {
            var instance = vue.getCurrentInstance();
            internals = instance.parent.ctx.renderer;
        }));
    }
}).mount(document.createElement('div'));
var _a$1 = internals, patch = _a$1.p, unmount = _a$1.um;
var Wrapper = /*#__PURE__*/ /*#__PURE__*/ /** @class */ (function () {
    function Wrapper(props, $vNode, $SVG, $mountedQueue, $parent) {
        this.props = props;
        this.$vNode = $vNode;
        this.$SVG = $SVG;
        this.$mountedQueue = $mountedQueue;
        this.$parent = $parent;
        this.$inited = true;
        this.$lastInput = intact.createVNode('div');
    }
    Wrapper.prototype.$init = function (props) { };
    Wrapper.prototype.$render = function (lastVNode, vNode, parentDom, anchor) {
        if (lastVNode) {
            intact.removeVNodeDom(lastVNode, parentDom);
        }
        else if (!parentDom) {
            parentDom = document.createDocumentFragment();
        }
        var vnode = vNode.props.vnode;
        patch(null, vnode, parentDom, anchor, getParent(this), null, this.$SVG);
        // add dom to the $lastInput for findDomFromVNode
        this.$lastInput.dom = vnode.el;
    };
    Wrapper.prototype.$update = function (lastVNode, vNode, parentDom, anchor) {
        var lastVnode = lastVNode.props.vnode;
        var nextVnode = vNode.props.vnode;
        patch(lastVnode, nextVnode, parentDom, anchor, getParent(this), null, this.$SVG);
        this.$lastInput.dom = nextVnode.el;
    };
    Wrapper.prototype.$unmount = function (vNode, nextVNode) {
        unmount(vNode.props.vnode, getParent(this), null, !!nextVNode);
    };
    return Wrapper;
}());
function getParent(instance) {
    var $parent = instance.$parent;
    do {
        var vueInstance = $parent.vueInstance;
        if (vueInstance) {
            return vueInstance;
        }
    } while ($parent = $parent.$parent);
    // should not hit this
    /* istanbul ignore next */
    return null;
}

function normalize(vnode) {
    if (intactShared.isInvalid(vnode))
        return null;
    if (intactShared.isStringOrNumber(vnode))
        return vnode;
    var type = vnode.type;
    var vNode;
    if (isIntactComponent(vnode)) {
        var props = normalizeProps(vnode);
        vNode = intact.createComponentVNode(4, type.Component, props, vnode.key, props.ref);
    }
    else {
        // ignore comment vNode
        if (type === vue.Comment)
            return null;
        // spread fragment
        // if (type === Fragment) {
        // return normalizeChildren(vnode.children as VNodeArrayChildren);
        // }
        vNode = intact.createComponentVNode(4, Wrapper, { vnode: vnode }, vnode.key);
    }
    // tell Vue that this is a read only object, and don't reactive it
    vNode.__v_isReadonly = true;
    return vNode;
}
function isIntactComponent(vnode) {
    return !!vnode.type.Component;
}
function normalizeChildren(vNodes) {
    var loop = function (vNodes) {
        if (Array.isArray(vNodes)) {
            var ret_1 = [];
            vNodes.forEach(function (vNode) {
                if (Array.isArray(vNode)) {
                    ret_1.push.apply(ret_1, loop(vNode));
                }
                else if (vue.isVNode(vNode)) {
                    ret_1.push(normalize(vNode));
                }
            });
            return ret_1;
        }
        return normalize(vNodes);
    };
    var ret = loop(vNodes);
    if (Array.isArray(ret)) {
        var l = ret.length;
        return l === 0 ? undefined : l === 1 ? ret[0] : ret;
    }
    return ret;
}
function normalizeProps(vnode) {
    var attrs = vnode.props;
    var slots = vnode.children;
    var Component = vnode.type.Component;
    var props = {};
    var propTypes = Component.typeDefs;
    for (var key in attrs) {
        var value = attrs[key];
        switch (key) {
            case 'ref': break;
            case 'class':
                props.className = value;
                break;
            case 'modelValue':
                props.value = value;
                break;
            default:
                if (isOn(key)) {
                    normalizeEvents(props, key, value);
                    break;
                }
                if (propTypes) {
                    var camelizedKey = vue.camelize(key);
                    value = normalizeBoolean(propTypes, key, camelizedKey, value);
                    key = camelizedKey;
                }
                props[key] = value;
                break;
        }
    }
    normalizeSlots(slots, props);
    normalizeDirs(vnode.dirs, props);
    normalizeRef(vnode.ref, props);
    return props;
}
var onRE = /^on[^a-z]/;
var isOn = function (key) { return onRE.test(key); };
function normalizeEvents(props, key, value) {
    var name;
    var cb = value;
    var _isArray = intactShared.isArray(value);
    var changeCallback = function (propName) { return function (v) {
        var modifiersKey = (propName === 'value' ? 'model' : propName) + "Modifiers";
        var _a = props[modifiersKey] || intactShared.EMPTY_OBJ, number = _a.number, trim = _a.trim;
        if (trim) {
            v = String(v).trim();
        }
        else if (number) {
            v = Number(v);
        }
        if (_isArray) {
            value.forEach(function (value) { return value(v); });
        }
        else {
            value(v);
        }
    }; };
    if (key.startsWith('onUpdate:')) {
        var propName = vue.camelize(key.substr(9));
        if (propName === 'modelValue')
            propName = 'value';
        name = "$model:" + propName;
        cb = changeCallback(propName);
    }
    else {
        key = key.substring(2);
        name = key[0].toLowerCase() + key.substring(1);
        if (_isArray) {
            cb = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                value.forEach(function (value) { return value.apply(void 0, args); });
            };
        }
    }
    props["ev-" + name] = cb;
}
function normalizeBoolean(propTypes, key, camelizedKey, value) {
    if (intactShared.hasOwn.call(propTypes, camelizedKey)) {
        var tmp = void 0;
        if ((
        // value is Boolean
        (tmp = propTypes[camelizedKey]) === Boolean ||
            tmp && (
            // value contains Boolean
            intactShared.isArray(tmp) && tmp.indexOf(Boolean) > -1 ||
                (tmp = tmp.type) && (
                // value.type is Boolean
                tmp === Boolean ||
                    // value.type contains Boolean
                    intactShared.isArray(tmp) && tmp.indexOf(Boolean) > -1))) &&
            (value === '' || value === key)) {
            value = true;
        }
    }
    return value;
}
function normalizeSlots(slots, props) {
    if (!slots)
        return;
    // is array children
    if (intactShared.isArray(slots)) {
        return props.children = normalizeChildren(slots);
    }
    // is string
    if (intactShared.isStringOrNumber(slots)) {
        return props.children = slots;
    }
    // the default slot maybe a scope slot, but we can not detect
    // whether it is or not, so we try to normalize it as children and
    // then treat it as a default scope slot too.
    if (slots.default) {
        var slot = slots.default;
        try {
            // Vue will detect whether the slot is invoked outside or not,
            // but it does not affetch anything in here,
            // so we keep the warning silent
            //
            // Vue will warn if we get property of undefined, we keep it silent
            // silentWarn();
            var validSlotContent = ensureValidVNode(slot());
            props.children = validSlotContent ? normalizeChildren(validSlotContent) : null;
            // resetWarn();
        }
        catch (e) { }
    }
    var blocks = null;
    var _loop_1 = function (key) {
        if (isInternalKey(key))
            return "continue";
        var slot = slots[key];
        if (!blocks)
            blocks = {};
        blocks[key] = function (parent, data) {
            // if the content is invalid, use parent instead
            // this is the default behavior of Vue
            var validSlotContent = ensureValidVNode(slot(data));
            return validSlotContent ? normalizeChildren(validSlotContent) : parent();
        };
    };
    for (var key in slots) {
        _loop_1(key);
    }
    if (blocks) {
        props.$blocks = blocks;
    }
}
function ensureValidVNode(vnodes) {
    if (!intactShared.isArray(vnodes))
        vnodes = [vnodes];
    return vnodes.some(function (child) {
        if (!vue.isVNode(child)) {
            return true;
        }
        if (child.type === vue.Comment) {
            return false;
        }
        if (child.type === vue.Fragment && !ensureValidVNode(child.children)) {
            return false;
        }
        return true;
    }) ? vnodes : null;
}
var isInternalKey = function (key) { return key[0] === '_' || key === '$stable'; };
function normalizeDirs(dirs, props) {
    if (!dirs)
        return;
    dirs.find(function (_a) {
        var dir = _a.dir, value = _a.value;
        // only handle v-show
        if (dir === vue.vShow) {
            if (!value) {
                (props.style || (props.style = {})).display = 'none';
            }
            return true;
        }
    });
}
function normalizeRef(rawRef, props) {
    if (intactShared.isFunction(rawRef))
        props.ref = rawRef;
    else if (rawRef) {
        props.ref = function (i) {
            setRef(rawRef, i);
        };
    }
}
function setRef(rawRef, value) {
    if (intactShared.isArray(rawRef)) {
        rawRef.forEach(function (r, i) { return setRef(r, value); });
        return;
    }
    var owner = rawRef.i, ref = rawRef.r;
    var refs = !Object.keys(owner.refs).length ? (owner.refs = {}) : owner.refs;
    if (intactShared.isString(ref)) {
        refs[ref] = value;
    }
    else if (vue.isRef(ref)) {
        ref.value = value;
    }
    else if (intactShared.isFunction(ref)) {
        ref(value, refs);
    }
    else {
        console.warn('Invalid template ref type:', value, "(" + typeof value + ")");
    }
}

function functionalWrapper(Component) {
    function Ctor(props, context) {
        if (context) {
            // invoked by Vue
            var forwardRef = props.forwardRef, rest = tslib.__rest(props, ["forwardRef"]);
            var _props = normalizeProps({
                props: rest,
                children: context.slots,
                type: {
                    Component: Component,
                },
                ref: forwardRef,
            });
            // functional component of intact must return VNodeComponentClass
            var vNode = Component(_props, true /* is in vue */);
            if (Array.isArray(vNode)) {
                return vNode.map(function (vNode) { return toVueVNode(vNode); });
            }
            return toVueVNode(vNode);
        }
        else {
            // invoked by Intact
            return Component(props);
        }
    }
    // Ctor.cid = cid;
    Ctor.displayName = Component.displayName || Component.name;
    return Ctor;
}
function toVueVNode(vNode) {
    // if (isStringOrNumber(vNode)) return vNode;
    if (vNode) {
        var props = vNode.props;
        return vue.h(vNode.tag, 
        // because Vue will normalize some styles, but the props of vNode in Intact
        // is immutable, we must clone it here.
        props ? tslib.__assign({}, props) : null);
    }
}

function setScopeId(el, vnode, scopeId, slotScopeIds, parentComponent) {
    if (scopeId) {
        hostSetScopeId(el, scopeId);
    }
    /* istanbul ignore next */
    if (slotScopeIds) {
        for (var i = 0; i < slotScopeIds.length; i++) {
            hostSetScopeId(el, slotScopeIds[i]);
        }
    }
    if (parentComponent) {
        var subTree = parentComponent.subTree;
        if (vnode === subTree) {
            var parentVNode = parentComponent.vnode;
            setScopeId(el, parentVNode, parentVNode.scopeId, 
            // slotScopeIds is @internal
            parentVNode.slotScopeIds, parentComponent.parent);
        }
    }
}
function hostSetScopeId(el, scopeId) {
    el.setAttribute(scopeId, '');
}

var currentInstance = null;
var _a = createStack(), pushMountedQueue = _a[0], popMountedQueue = _a[1];
var _b = createStack(), pushInstance = _b[0], popInstance = _b[1];
var Component = /*#__PURE__*/ /*#__PURE__*/ /** @class */ (function (_super) {
    tslib.__extends(Component, _super);
    function Component(props, $vNode, $SVG, $mountedQueue, $parent) {
        var _this = _super.call(this, props, $vNode, $SVG, $mountedQueue, $parent) || this;
        _this.isVue = false;
        var vuePublicInstance = $vNode._vueInstance;
        _this.vueInstance = vuePublicInstance;
        if (vuePublicInstance) {
            // set the instance to the setupState of vueIntance.$
            // ps: setupState is @internal in vue
            vuePublicInstance.setupState.instance = _this;
        }
        // disable async component 
        _this.$inited = true;
        return _this;
    }
    Object.defineProperty(Component, "__vccOpts", {
        get: function () {
            var Ctor = this;
            if (Ctor.__cache) {
                return Ctor.__cache;
            }
            return (Ctor.__cache = {
                name: Ctor.displayName || Ctor.name,
                Component: Ctor,
                setup: function (props, setupContext) {
                    var setupState = { instance: null };
                    var proxy = new Proxy(setupState, {
                        get: function (_a, key) {
                            var instance = _a.instance;
                            if (key === '__v_isReactive')
                                return true;
                            if (instance === null)
                                return null;
                            if (key === 'instance')
                                return instance;
                            var value = instance[key];
                            if (intactShared.isFunction(value)) {
                                // should bind instance, otherwise the `this` may point to proxyToUse
                                return value.bind(instance);
                            }
                            return value;
                        },
                        set: function (setupState, key, value) {
                            // if (key === 'instance') {
                            return Reflect.set(setupState, key, value);
                            // }
                            // return Reflect.set(setupState.instance!, key, value);
                        },
                        getOwnPropertyDescriptor: function () {
                            return {
                                value: undefined,
                                writable: true,
                                enumerable: true,
                                configurable: true,
                            };
                        },
                        ownKeys: function () {
                            return [];
                        }
                    });
                    return proxy;
                },
                render: function (proxyToUse, renderCache, props, setupState) {
                    var vueInstance = proxyToUse.$;
                    var vNode = normalize(vueInstance.vnode);
                    var _setScopeId = function (element) {
                        var vnode = vueInstance.vnode;
                        setScopeId(element, vnode, vnode.scopeId, vnode.slotScopeIds, vueInstance.parent);
                    };
                    var mountedQueue = pushMountedQueue([]);
                    var subTree = vue.createVNode(vue.Comment);
                    var parentComponent = currentInstance;
                    var isSVG = parentComponent ? parentComponent.$SVG : false;
                    if (!vueInstance.isMounted) {
                        vueInstance.subTree = subTree;
                        vNode._vueInstance = vueInstance;
                        intact.mount(vNode, null, parentComponent, isSVG, null, mountedQueue);
                        var instance = vNode.children;
                        instance.isVue = true;
                        // hack the nodeOps of Vue to create the real dom instead of a comment
                        var element_1 = intact.findDomFromVNode(vNode, true);
                        var documentCreateComment_1 = document.createComment;
                        document.createComment = function () {
                            document.createComment = documentCreateComment_1;
                            return element_1;
                        };
                        // scope id
                        _setScopeId(element_1);
                    }
                    else {
                        var instance = setupState.instance;
                        var lastVNode = instance.$vNode;
                        intact.patch(lastVNode, vNode, this.$el.parentElement, parentComponent, isSVG, null, mountedQueue, false);
                        // element may have chagned
                        var element = intact.findDomFromVNode(vNode, true);
                        var oldSubTree = vueInstance.subTree;
                        if (oldSubTree.el !== element) {
                            oldSubTree.el = element;
                            // set scope id
                            _setScopeId(element);
                        }
                    }
                    return subTree;
                },
                mounted: function () {
                    callMountedQueue();
                },
                updated: function () {
                    callMountedQueue();
                },
                beforeUnmount: function () {
                    // we should get name by instance, if the name starts with '$'
                    intact.unmount(this.instance.$vNode);
                },
            });
        },
        enumerable: false,
        configurable: true
    });
    Component.prototype.$render = function (lastVNode, nextVNode, parentDom, anchor, mountedQueue) {
        var lastIntance = currentInstance;
        currentInstance = pushInstance(this);
        _super.prototype.$render.call(this, lastVNode, nextVNode, parentDom, anchor, mountedQueue);
        popInstance();
        currentInstance = lastIntance;
    };
    Component.prototype.$update = function (lastVNode, nextVNode, parentDom, anchor, mountedQueue, force) {
        var lastIntance = currentInstance;
        currentInstance = pushInstance(this);
        _super.prototype.$update.call(this, lastVNode, nextVNode, parentDom, anchor, mountedQueue, force);
        popInstance();
        currentInstance = lastIntance;
    };
    Component.__cache = null;
    Component.functionalWrapper = functionalWrapper;
    Component.normalize = normalizeChildren;
    return Component;
}(intact.Component));
function createStack() {
    var stack = [];
    function pushStack(item) {
        stack.push(item);
        return item;
    }
    function popStack() {
        return stack.pop();
    }
    return [pushStack, popStack];
}
function callMountedQueue() {
    var mountedQueue = popMountedQueue();
    /* istanbul ignore next */
    {
        if (!mountedQueue) {
            throw new Error("\"mountedQueue\" is undefined, maybe this is a bug of Intact-Vue");
        }
    }
    intact.callAll(mountedQueue);
}

exports.Component = Component;
