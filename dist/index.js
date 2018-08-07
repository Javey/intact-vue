'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Vue = _interopDefault(require('vue'));
var Intact = _interopDefault(require('intact/dist'));

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};











var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};









var objectWithoutProperties = function (obj, keys) {
  var target = {};

  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }

  return target;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var h = Intact.Vdt.miss.h;
var patch = Vue.prototype.__patch__;
var _Intact$utils = Intact.utils;
var _get = _Intact$utils.get;
var _set = _Intact$utils.set;


function normalizeChildren(vNodes) {
    if (Array.isArray(vNodes)) {
        var ret = [];
        vNodes.forEach(function (vNode) {
            ret.push(normalize(vNode));
        });
        return ret;
    }
    return normalize(vNodes);
}

function normalize(vNode) {
    if (vNode == null) return vNode;
    var type = typeof vNode === 'undefined' ? 'undefined' : _typeof(vNode);
    if (type === 'string' || type === 'number') return vNode;
    // is a intact vnode
    if (vNode.type) return vNode;
    if (isIntactComponent(vNode)) {
        var options = vNode.componentOptions;
        return h(options.Ctor, normalizeProps(vNode), null, null, vNode.key, vNode.ref);
    }
    if (vNode.text !== undefined) {
        return vNode.text;
    }
    return h(Wrapper, { vueVNode: vNode }, null, handleClassName(vNode));
}

function normalizeProps(vNode) {
    var componentOptions = vNode.componentOptions;
    var data = vNode.data;
    var attrs = data.attrs;
    var propTypes = componentOptions.Ctor.propTypes;
    var props = {};

    if (attrs) {
        for (var key in attrs) {
            if (~['staticClass', 'class', 'style', 'staticStyle'].indexOf(key)) continue;
            var value = attrs[key];
            if (propTypes && propTypes[key] === Boolean && value === '') {
                value = true;
            }
            props[key] = value;
        }
    }

    // add className
    props.className = handleClassName(vNode);
    // add style
    props.style = handleStyle(vNode);

    // add key
    if (vNode.key) {
        props.key = vNode.key;
    } else if (data.key) {
        props.key = data.key;
    }

    // if exists scoped slots
    var scopedSlots = data.scopedSlots;
    if (scopedSlots) {
        var _loop = function _loop(_key) {
            props[_key] = function () {
                return normalizeChildren(scopedSlots[_key].apply(this, arguments));
            };
        };

        for (var _key in scopedSlots) {
            _loop(_key);
        }
    }

    // if exists v-model
    var model = data.model;
    if (model) {
        props.value = model.value;
        props['v-model'] = model.expression;
    }
    if (data.directives) {
        var directives = data.directives;
        for (var i = 0; i < directives.length; i++) {
            var _model = directives[i];
            if (_model.name === 'model') {
                // for vue@2.1.8
                props.value = _model.value;
                props['v-model'] = _model.expression;
                break;
            } else if (_model.name === 'show' && !_model.value) {
                if (props.style) {
                    props.style.display = 'none';
                } else {
                    props.style = { display: 'none' };
                }
            }
        }
    }

    // convert ref string to function
    handleRef(vNode, props);

    for (var _key2 in componentOptions.listeners) {
        // is a v-model directive of vue
        if (_key2 === 'input') {
            props['ev-$change:value'] = function (c, v) {
                componentOptions.listeners.input(v);
            };
        } else {
            props['ev-' + _key2] = componentOptions.listeners[_key2];
        }
    }

    // handle children and blocks
    var slots = vNode.slots || resolveSlots(componentOptions.children);

    var _getChildrenAndBlocks = getChildrenAndBlocks(slots),
        children = _getChildrenAndBlocks.children,
        _blocks = _getChildrenAndBlocks._blocks;
    // for Intact Functional component, the blocks has been handled
    // In this case, we should merge them 


    props.children = children;
    if (props._blocks) {
        Object.assign(props._blocks, _blocks);
    } else {
        props._blocks = _blocks;
    }

    normalizeContext(vNode, props);

    return props;
}

function normalizeContext(vNode, props) {
    var $data = vNode.context.$data;
    props._context = {
        data: {
            get: function get$$1(name) {
                if (name != null) {
                    return _get($data, name);
                } else {
                    return $data;
                }
            },
            set: function set$$1(name, value) {
                _set($data, name, value);
            }
        }
    };
}

function getChildrenAndBlocks(slots) {
    var d = slots.default,
        rest = objectWithoutProperties(slots, ['default']);

    var blocks = void 0;
    if (rest) {
        blocks = {};

        var _loop2 = function _loop2(key) {
            blocks[key] = function () {
                return normalizeChildren(rest[key]);
            };
        };

        for (var key in rest) {
            _loop2(key);
        }
    }

    return {
        children: normalizeChildren(d),
        _blocks: blocks
    };
}

function functionalWrapper(Component) {
    function Ctor(props) {
        return Component(props);
    }

    Ctor.options = {
        functional: true,
        render: function render(h, props) {
            var _props = normalizeProps({
                // fake
                componentOptions: {
                    Ctor: Component,
                    listeners: props.listeners
                },
                data: props.data,
                slots: props.slots(),
                context: {
                    $data: props.parent.$data
                }
            });
            var vNode = Component(_props, true /* is in vue */);
            if (Array.isArray(vNode)) {
                throw new Error('Array children does not be supported.');
            }

            var attrs = {};
            var __props = { attrs: attrs };
            for (var key in vNode.props) {
                if (~['children', '_context', 'className', 'style', 'ref', 'key'].indexOf(key)) continue;
                attrs[key] = vNode.props[key];
            }
            if (props.data.ref) {
                __props.ref = props.data.ref;
            }
            if (vNode.props.className) {
                __props.staticClass = vNode.props.className;
            }
            if (vNode.props.style) {
                __props.staticStyle = vNode.props.style;
            }
            __props.key = vNode.props.key;

            return h(vNode.tag, __props, vNode.props.children);
        }
    };

    Ctor.cid = 'IntactFunctionalComponent';

    return Ctor;
}

var Wrapper = function () {
    function Wrapper() {
        classCallCheck(this, Wrapper);
    }

    Wrapper.prototype.init = function init(lastVNode, nextVNode) {
        // let the component destroy by itself
        this.destroyed = true;
        this._addProps(nextVNode);
        return patch(null, nextVNode.props.vueVNode, false, false, this.parentDom);
    };

    Wrapper.prototype.update = function update(lastVNode, nextVNode) {
        this._addProps(nextVNode);
        return patch(lastVNode.props.vueVNode, nextVNode.props.vueVNode, false, false, this.parentDom);
    };

    Wrapper.prototype.destroy = function destroy(vNode) {
        patch(vNode.props.vueVNode, null);
    };

    // maybe the props has been changed, so we change the vueVNode's data


    Wrapper.prototype._addProps = function _addProps(vNode) {
        // for Intact reusing the dom
        this.vdt = { vNode: vNode };
        var props = vNode.props;
        var vueVNode = props.vueVNode;
        for (var key in props) {
            if (key === 'vueVNode') continue;
            if (!vueVNode.data) vueVNode.data = {};
            var data = vueVNode.data;
            var prop = props[key];
            // is event
            if (key.substr(0, 3) === 'ev-') {
                if (!data.on) data.on = {};
                data.on[key.substr(3)] = prop;
            } else {
                if (!data.attrs) data.attrs = {};
                data.attrs[key] = prop;
            }
        }
    };

    return Wrapper;
}();

function handleRef(vNode, props) {
    var key = vNode.data.ref;
    if (key) {
        var refs = vNode.context.$refs;
        var ref = void 0;
        props.ref = function (i) {
            if (i) {
                ref = i;
                if (vNode.data.refInFor) {
                    if (!Array.isArray(refs[key])) {
                        refs[key] = [ref];
                    } else if (refs[key].indexOf(ref) < 0) {
                        refs[key].push(ref);
                    }
                } else {
                    refs[key] = ref;
                }
            } else {
                if (Array.isArray(refs[key])) {
                    var index = refs[key].indexOf(ref);
                    if (~index) {
                        refs[key].splice(index, 1);
                    }
                } else {
                    refs[key] = ref = undefined;
                }
            }
        };
    }
}

function handleClassName(vNode) {
    var className = void 0;
    var data = vNode.data;
    if (data) {
        if (data.staticClass) {
            className = data.staticClass;
        }
        if (data.class) {
            if (!className) {
                className = stringifyClass(data.class);
            } else {
                className += ' ' + stringifyClass(data.class);
            }
        }
    }

    return className;
}

function stringifyClass(className) {
    if (className == null) return '';
    if (Array.isArray(className)) {
        return stringifyArray(className);
    }
    if ((typeof className === 'undefined' ? 'undefined' : _typeof(className)) === 'object') {
        return stringifyObject(className);
    }
    if (typeof className === 'string') {
        return className;
    }

    return '';
}

function stringifyArray(value) {
    var res = '';
    var stringified = void 0;
    for (var i = 0; i < value.length; i++) {
        if ((stringified = stringifyClass(value[i])) != null && stringified !== '') {
            if (res) res += ' ';
            res += stringified;
        }
    }

    return res;
}

function stringifyObject(value) {
    var res = '';
    for (var key in value) {
        if (value[key]) {
            if (res) res += ' ';
            res += key;
        }
    }

    return res;
}

function handleStyle(vNode) {
    var style = void 0;
    var data = vNode.data;
    if (data) {
        style = getStyleBinding(data.style);
        if (data.staticStyle) {
            return Object.assign(data.staticStyle, style);
        }
    }

    return style;
}

function getStyleBinding(style) {
    if (!style) return style;

    if (Array.isArray(style)) {
        return toObject(style);
    }
    if (typeof style === 'string') {
        return parseStyleText(style);
    }

    return style;
}

function toObject(arr) {
    var res = {};
    for (var i = 0; i < arr.length; i++) {
        if (arr[i]) {
            Object.assign(res, arr[i]);
        }
    }

    return res;
}

var cache = Object.create(null);
function parseStyleText(cssText) {
    var hit = cache[cssText];
    if (hit) return hit;

    var res = {};
    var listDelimiter = /;(?![^(]*\))/g;
    var propertyDelimiter = /:(.+)/;
    cssText.split(listDelimiter).forEach(function (item) {
        if (item) {
            var tmp = item.split(propertyDelimiter);
            tmp.length > 1 && (res[tmp[0].trim()] = tmp[1].trim());
        }
    });
    cache[cssText] = res;

    return res;
}

function isIntactComponent(vNode) {
    var i = vNode.data;
    return i && (i = i.hook) && (i = i.init) && vNode.componentOptions.Ctor.cid === 'IntactVue';
}

// copy from vue/src/core/instance/render-helpers/resolve-slots.js
function resolveSlots(children) {
    var slots = {};
    if (!children) {
        return slots;
    }
    for (var i = 0, l = children.length; i < l; i++) {
        var child = children[i];
        var data = child.data;
        // remove slot attribute if the node is resolved as a Vue slot node
        if (data && data.attrs && data.attrs.slot) {
            delete data.attrs.slot;
        }
        if (data && data.slot != null) {
            var name = data.slot;
            var slot = slots[name] || (slots[name] = []);
            if (child.tag === 'template') {
                slot.push.apply(slot, child.children || []);
            } else {
                slot.push(child);
            }
        } else {
            (slots.default || (slots.default = [])).push(child);
        }
    }
    // ignore slots that contains only whitespace
    for (var _name in slots) {
        if (slots[_name].every(isWhitespace)) {
            delete slots[_name];
        }
    }
    return slots;
}

function isWhitespace(node) {
    return node.isComment && !node.asyncFactory || node.text === ' ';
}

// for webpack alias Intact to IntactVue
var _Vue$prototype = Vue.prototype;
var init = _Vue$prototype.init;
var $nextTick = _Vue$prototype.$nextTick;
var _updateFromParent = _Vue$prototype._updateFromParent;


var activeInstance = void 0;
var mountedQueue = void 0;
var ignoreMountedQueue = false;

var IntactVue = function (_Intact) {
    inherits(IntactVue, _Intact);

    function IntactVue(options) {
        classCallCheck(this, IntactVue);

        var parentVNode = options && options._parentVnode;
        if (parentVNode) {
            var vNode = normalize(parentVNode);

            // inject hook
            // if exist mountedQueue, it indicate that the component is nested into vue element
            // we call __patch__ to render it, and it will lead to call mounted hooks
            // but this component has not been appended
            // so we do it nextTick
            var _this = possibleConstructorReturn(this, _Intact.call(this, vNode.props));

            options.mounted = [activeInstance ? function () {
                _this.$nextTick(_this.mount);
            } : _this.mount];

            // force vue update intact component
            options._renderChildren = true;

            _this.$options = options;
            _this.$vnode = parentVNode;
            _this._isVue = true;

            _this.vNode = vNode;
            vNode.children = _this;
        } else {
            var _this = possibleConstructorReturn(this, _Intact.call(this, options));
        }
        _this._prevActiveInstance = activeInstance;
        activeInstance = _this;
        return possibleConstructorReturn(_this);
    }

    IntactVue.prototype.init = function init(lastVNode, nextVNode) {
        var _this2 = this;

        var init = function init() {
            var element = _Intact.prototype.init.call(_this2, lastVNode, nextVNode);
            activeInstance = _this2._prevActiveInstance;
            _this2._prevActiveInstance = null;

            return element;
        };

        if (!this._isVue) return init();

        var prevIgnoreMountedQueue = ignoreMountedQueue;
        if (!nextVNode) {
            ignoreMountedQueue = true;
        }
        if (!ignoreMountedQueue) {
            mountedQueue = this.mountedQueue;
        }

        var element = init();

        ignoreMountedQueue = prevIgnoreMountedQueue;

        return element;
    };

    IntactVue.prototype.update = function update(lastVNode, nextVNode, fromPending) {
        var _this3 = this;

        var update = function update() {
            _this3._prevActiveInstance = activeInstance;
            activeInstance = _this3;
            var element = _Intact.prototype.update.call(_this3, lastVNode, nextVNode, fromPending);
            activeInstance = _this3._prevActiveInstance;
            _this3._prevActiveInstance = null;

            return element;
        };

        if (!this._isVue) return update();

        var prevIgnoreMountedQueue = ignoreMountedQueue;
        if (!nextVNode && !fromPending && this._updateCount === 0) {
            ignoreMountedQueue = true;
        }
        if (!ignoreMountedQueue) {
            mountedQueue = this.mountedQueue;
        }

        var element = update();

        // if ignoreMountedQueue is true, then the mountedQueue will
        // be set to null in Intact, we reset it here
        if (ignoreMountedQueue) {
            this.mountedQueue = mountedQueue;
        }

        ignoreMountedQueue = prevIgnoreMountedQueue;

        return element;
    };

    IntactVue.prototype.$mount = function $mount(el, hydrating) {
        this.__initMountedQueue();

        this.parentVNode = this.vNode.parentVNode = this._prevActiveInstance && this._prevActiveInstance.vNode;
        // disable intact async component
        this.inited = true;
        this.$el = _Intact.prototype.init.call(this, null, this.vNode);
        this.vNode.dom = this.$el;
        this._vnode = {};
        var options = this.$options;
        var refElm = options._refElm;
        if (refElm) {
            options._parentElm.insertBefore(this.$el, refElm);
        } else {
            options._parentElm.appendChild(this.$el);
        }

        this.__triggerMountedQueue();
        activeInstance = this._prevActiveInstance;
        this._prevActiveInstance = null;
    };

    IntactVue.prototype.$forceUpdate = function $forceUpdate() {
        this.__initMountedQueue();

        this._prevActiveInstance = activeInstance;
        activeInstance = this;

        var vNode = normalize(this.$vnode);
        var lastVNode = this.vNode;
        vNode.children = this;

        this.vNode = vNode;
        this.parentVNode = this.vNode.parentVNode = this._prevActiveInstance && this._prevActiveInstance.vNode;
        _Intact.prototype.update.call(this, lastVNode, vNode);

        // force vue update intact component
        // reset it, because vue may set it to undefined
        this.$options._renderChildren = true;

        // let the vNode patchable for vue to register ref
        // this._vnode = this.vdt.vNode;
        // don't let vue to register ref, it will change className and so on
        // handle it there
        var lastRef = lastVNode.ref;
        var nextRef = vNode.ref;
        if (lastRef !== nextRef) {
            if (lastRef) {
                lastRef(null);
            }
            if (nextRef) {
                nextRef(this);
            }
        }

        this.__triggerMountedQueue();

        activeInstance = this._prevActiveInstance;
        this._prevActiveInstance = null;
    };

    IntactVue.prototype.$destroy = function $destroy() {
        this.destroy();
    };

    // we should promise that all intact components have been mounted


    IntactVue.prototype.__initMountedQueue = function __initMountedQueue() {
        this._shouldTrigger = false;
        if (!mountedQueue) {
            this._shouldTrigger = true;
            if (!this.mountedQueue) {
                _Intact.prototype._initMountedQueue.call(this);
            }
            mountedQueue = this.mountedQueue;
        } else {
            this.mountedQueue = mountedQueue;
        }
    };

    IntactVue.prototype.__triggerMountedQueue = function __triggerMountedQueue() {
        if (this._shouldTrigger) {
            _Intact.prototype._triggerMountedQueue.call(this);
            mountedQueue = null;
            this._shouldTrigger = false;
        }
    };

    // wrapp vm._c to return Intact vNode.
    // __c(...args) {
    // const vNode = vm._c(...args); 

    // }

    // mock api


    IntactVue.prototype.$on = function $on() {};

    IntactVue.prototype.$off = function $off() {};

    return IntactVue;
}(Intact);

IntactVue.cid = 'IntactVue';
IntactVue.options = Object.assign({}, Vue.options);
IntactVue.functionalWrapper = functionalWrapper;
IntactVue.normalize = normalizeChildren;
IntactVue.prototype.$nextTick = $nextTick;
// for vue@2.1.8
IntactVue.prototype._updateFromParent = _updateFromParent;

module.exports = IntactVue;
