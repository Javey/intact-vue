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









var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
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

var _Intact$Vdt$miss = Intact.Vdt.miss;
var h = _Intact$Vdt$miss.h;
var hooks = _Intact$Vdt$miss.hooks;
var config = _Intact$Vdt$miss.config;
var _Intact$utils = Intact.utils;
var _get = _Intact$utils.get;
var _set = _Intact$utils.set;
var extend$1 = _Intact$utils.extend;
var isArray = _Intact$utils.isArray;
var create = _Intact$utils.create;
var hasOwn = _Intact$utils.hasOwn;
var each = _Intact$utils.each;

var _textVNode = Vue.prototype._v('');
var VueVNode = _textVNode.constructor;

// for scoped style
if (hooks) {
    hooks.beforeInsert = function (vNode) {
        var dom = vNode.dom;
        var parent = vNode.parentVNode;
        var i = void 0;
        var j = void 0;
        while (parent) {
            if ((i = parent.tag) && i.cid === 'IntactVue' && (i = parent.children.$options)) {
                if ((i = j = i.parent) && (i = i.$options) && (i = i._scopeId)) {
                    dom.setAttribute(i, '');
                }
                if (j) {
                    // find vue component parent while we has found the intact component
                    parent = j.$parent;
                    while (parent) {
                        if ((i = parent.$options) && (i = i._scopeId)) {
                            dom.setAttribute(i, '');
                        }
                        parent = parent.$parent;
                    }
                }
                break;
            } else {
                parent = parent.parentVNode;
            }
        }
    };
}

// disable delegate events
if (config) {
    config.disableDelegate = true;
}

// for get $parent
Vue.mixin({
    beforeCreate: function beforeCreate() {
        if (!this.$parent && this.$vnode) {
            this.$parent = this.$vnode.context;
        }
    }
});

function normalizeChildren(vNodes) {
    var loop = function loop(vNodes) {
        if (isArray(vNodes)) {
            var _ret = [];
            vNodes.forEach(function (vNode) {
                if (isArray(vNode)) {
                    _ret.push.apply(_ret, loop(vNode));
                } else {
                    _ret.push(normalize(vNode));
                }
            });
            return _ret;
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

function normalize(vNode) {
    if (vNode == null) return vNode;
    var type = typeof vNode === 'undefined' ? 'undefined' : _typeof(vNode);
    if (type === 'string' || type === 'number') return vNode;
    // is a intact vnode
    if (vNode.type) return vNode;
    if (vNode.text !== undefined) {
        return vNode.text;
    }

    if (isIntactComponent(vNode)) {
        var options = vNode.componentOptions;
        vNode = h(options.Ctor, normalizeProps(vNode), null, null, vNode.key, vNode.ref);
    } else {
        vNode = h(Wrapper, { vueVNode: vNode }, null, handleClassName(vNode), vNode.key);
    }

    vNode._isVue = true; // let vue don't observe it when it is used as property
    return vNode;
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
            if (propTypes) {
                var camelizedKey = camelize(key);
                if (hasOwn.call(propTypes, camelizedKey)) {
                    key = camelizedKey;
                    var tmp = void 0;
                    if ((
                    // value is Boolean
                    (tmp = propTypes[key]) === Boolean || tmp && (
                    // value contains Boolean
                    isArray(tmp) && tmp.indexOf(Boolean) > -1 ||
                    // value.type is Boolean
                    tmp.type === Boolean ||
                    // value.type contains Boolean
                    isArray(tmp.type) && tmp.type.indexOf(Boolean) > -1)) && (value === '' || value === key)) {
                        value = true;
                    }
                }
            }
            props[key] = value;
        }
    }

    // add className
    var className = handleClassName(vNode);
    if (className !== undefined) {
        props.className = className;
    }
    // add style
    var style = handleStyle(vNode);
    if (style !== undefined) {
        props.style = style;
    }

    // add key
    if (vNode.key) {
        props.key = vNode.key;
    } else if (data.key) {
        props.key = data.key;
    }

    // if exists scoped slots
    var scopedSlots = data.scopedSlots;
    if (scopedSlots) {
        var blocks = props._blocks ? props._blocks : props._blocks = {};

        var _loop = function _loop(_key) {
            blocks[_key] = function (parent) {
                for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key2 = 1; _key2 < _len; _key2++) {
                    args[_key2 - 1] = arguments[_key2];
                }

                return normalizeChildren(scopedSlots[_key].apply(this, args));
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

    var listeners = componentOptions.listeners;
    if (listeners) {
        var _loop2 = function _loop2(_key4) {
            var _cb = listeners[_key4];
            var cb = _cb;
            var _isArray = isArray(_cb);
            var callCb = function callCb(c, v) {
                if (_isArray) {
                    each(_cb, function (cb) {
                        return cb(v);
                    });
                } else {
                    _cb(v);
                }
            };

            if (_key4 === 'input') {
                // is a v-model directive of vue
                _key4 = '$change:value';
                cb = callCb;
            } else if (_key4.substr(0, 7) === 'update:') {
                // delegate update:prop(sync modifier) to $change:prop
                // propName has been camelized by Vue, don't do this again
                // key = `$change:${camelize(key.substr(7))}`;
                var _name = _key4.substr(7);
                if (_name.indexOf('-') > -1) return 'continue';
                _key4 = '$change:' + _name;
                cb = callCb;
            }

            // if there is a $change:prop originally, set it as array
            var name = 'ev-' + camelize(_key4);
            if (props[name]) {
                props[name] = [].concat(props[name], cb);
            } else {
                props[name] = cb;
            }
            _key3 = _key4;
        };

        for (var _key3 in listeners) {
            var _ret3 = _loop2(_key3);

            if (_ret3 === 'continue') continue;
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
        extend$1(props._blocks, _blocks);
    } else {
        props._blocks = _blocks;
    }

    normalizeContext(vNode, props);

    return props;
}

function normalizeContext(vNode, props) {
    var context = vNode.context;
    props._context = {
        data: {
            get: function get$$1(name) {
                if (name != null) {
                    // for get both props and data
                    return _get(context, name);
                } else {
                    return context.$data;
                }
            },
            set: function set$$1(name, value) {
                _set(context, name, value);
            },

            $router: _get(context, '_routerRoot._router')
        }
    };
}

function getChildrenAndBlocks(slots) {
    var d = slots.default,
        rest = objectWithoutProperties(slots, ['default']);

    var blocks = void 0;
    if (rest) {
        blocks = {};

        var _loop3 = function _loop3(key) {
            blocks[key] = function () {
                return normalizeChildren(rest[key]);
            };
        };

        for (var key in rest) {
            _loop3(key);
        }
    }

    return {
        children: normalizeChildren(d),
        _blocks: blocks
    };
}

function toVueVNode(h, vNode, props) {
    var attrs = {};
    var __props = { attrs: attrs };
    var vNodeProps = vNode.props;
    for (var key in vNodeProps) {
        if (~['children', '_context', 'className', 'style', 'ref', 'key'].indexOf(key)) continue;
        attrs[key] = vNodeProps[key];
    }
    if (vNode.ref) {
        __props.ref = props.data.ref;
    }
    if (vNodeProps.className) {
        __props.staticClass = vNodeProps.className;
    }
    if (vNode.props.style) {
        __props.staticStyle = vNodeProps.style;
    }
    if (vNode.key != null) {
        __props.key = vNodeProps.key;
    }
    var children = vNodeProps.children;
    if (children && !Array.isArray(children)) {
        children = [children];
    }

    return h(vNode.tag, __props, children);
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
                context: props.parent
            });
            var vNode = Component(_props, true /* is in vue */);
            if (isArray(vNode)) {
                return vNode.map(function (vNode) {
                    return toVueVNode(h, vNode, props);
                });
            }
            return toVueVNode(h, vNode, props);
        }
    };

    Ctor.cid = 'IntactFunctionalComponent';

    return Ctor;
}

var ignorePropRegExp = /_ev[A-Z]/;
var patch = Vue.prototype.__patch__;
// const update = Vue.prototype._update;

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
        // if we reuse the vNode, clone it
        if (vueVNode.elm) {
            vueVNode = cloneVNode(vueVNode);
        }
        for (var key in props) {
            if (key === 'vueVNode') continue;
            if (ignorePropRegExp.test(key)) continue;
            if (!vueVNode.data) vueVNode.data = {};
            var data = vueVNode.data;
            var prop = props[key];
            // is event
            if (key === 'className') {
                data.staticClass = prop;
                delete data.class;
            } else if (key === 'style') {
                if (data.staticStyle) {
                    data.staticStyle = _extends({}, data.staticStyle, prop);
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

        vNode.props = _extends({}, props, { vueVNode: vueVNode });
    };

    return Wrapper;
}();

function handleRef(vNode, props) {
    var key = vNode.data.ref;
    if (key) {
        var refs = vNode.context.$refs;
        props.ref = function (i, isRemove) {
            // if we pass the ref to intact component, ignore it directlty
            if (!refs) return;
            if (!isRemove) {
                if (vNode.data.refInFor) {
                    if (!isArray(refs[key])) {
                        refs[key] = [i];
                    } else if (refs[key].indexOf(i) < 0) {
                        refs[key].push(i);
                    }
                } else {
                    refs[key] = i;
                }
            } else {
                if (isArray(refs[key])) {
                    var index = refs[key].indexOf(i);
                    if (~index) {
                        refs[key].splice(index, 1);
                    }
                } else {
                    refs[key] = undefined;
                }
            }
        };
        props.ref.key = key;
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
    if (isArray(className)) {
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
            return extend$1(data.staticStyle, style);
        }
    }

    return style;
}

function getStyleBinding(style) {
    if (!style) return style;

    if (isArray(style)) {
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
            extend$1(res, arr[i]);
        }
    }

    return res;
}

var cache = create(null);
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
            var _name2 = data.slot;
            var slot = slots[_name2] || (slots[_name2] = []);
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
    for (var _name3 in slots) {
        if (slots[_name3].every(isWhitespace)) {
            delete slots[_name3];
        }
    }
    return slots;
}

function isWhitespace(node) {
    return node.isComment && !node.asyncFactory || node.text === ' ';
}

// copy from vue/src/core/vdom/vnode.js
function cloneVNode(vnode) {
    var cloned = new VueVNode(vnode.tag,
    // clone data
    vnode.data ? _extends({}, vnode.data) : vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // a child.
    vnode.children && vnode.children.slice(), vnode.text, vnode.elm, vnode.context, vnode.componentOptions, vnode.asyncFactory);
    cloned.ns = vnode.ns;
    cloned.isStatic = vnode.isStatic;
    cloned.key = vnode.key;
    cloned.isComment = vnode.isComment;
    cloned.fnContext = vnode.fnContext;
    cloned.fnOptions = vnode.fnOptions;
    cloned.fnScopeId = vnode.fnScopeId;
    cloned.asyncMeta = vnode.asyncMeta;
    cloned.isCloned = true;
    return cloned;
}

function cached(fn) {
    var cache = Object.create(null);
    return function (str) {
        var hit = cache[str];
        return hit || (cache[str] = fn(str));
    };
}

/**
 * Camelize a hyphen-delimited string.
 */
var camelizeRE = /-(\w)/g;
var camelize = cached(function (str) {
    return str.replace(camelizeRE, function (_, c) {
        return c ? c.toUpperCase() : '';
    });
});

// for webpack alias Intact to IntactVue
var _Vue$prototype = Vue.prototype;
var init = _Vue$prototype.init;
var $nextTick = _Vue$prototype.$nextTick;
var _updateFromParent = _Vue$prototype._updateFromParent;

var extend = Intact.utils.extend;

var activeInstance = void 0;
var mountedQueue = void 0;

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
            // options.mounted = [
            // activeInstance ?
            // () => {
            // this.$nextTick(this.mount);
            // } :
            // this.mount
            // ];

            // force vue update intact component
            var _this = possibleConstructorReturn(this, _Intact.call(this, vNode.props));

            options._renderChildren = true;

            _this.$options = options;
            _this.$vnode = parentVNode;
            _this._isVue = true;

            // for compitibility of vue@2.6
            _this.$scopedSlots = { $stable: true };

            _this.vNode = vNode;
            vNode.children = _this;

            // for devtools
            var parent = options.parent;
            if (parent) {
                _this.$parent = parent;
                _this.$root = parent.$root;
                parent.$children.push(_this);
            }
            _this.$children = [];
            _this._data = _this.props;
            _this.$refs = {};
            _this._uid = _this.uniqueId;
            options.name = _this.displayName || _this.constructor.name;
        } else {
            var _this = possibleConstructorReturn(this, _Intact.call(this, options));
        }
        return possibleConstructorReturn(_this);
    }

    IntactVue.prototype.init = function init(lastVNode, nextVNode) {
        var _this2 = this;

        var init = function init() {
            _this2.__pushActiveInstance();
            var element = _Intact.prototype.init.call(_this2, lastVNode, nextVNode);
            _this2.__popActiveInstance();

            return element;
        };

        if (!this._isVue) return init();

        mountedQueue = this.mountedQueue;

        var element = init();

        return element;
    };

    IntactVue.prototype.update = function update(lastVNode, nextVNode, fromPending) {
        var _this3 = this;

        var update = function update() {
            _this3.__pushActiveInstance();
            var element = _Intact.prototype.update.call(_this3, lastVNode, nextVNode, fromPending);
            _this3.__popActiveInstance();

            return element;
        };

        if (!this._isVue) return update();

        // maybe update in updating
        var oldTriggerFlag = this._shouldTrigger;
        this.__initMountedQueue();

        var element = update();

        this.__triggerMountedQueue();
        this._shouldTrigger = oldTriggerFlag;

        // should update elm of vnode of Vue to let Vue hanlde dom correctly
        this.$vnode.elm = element;

        return element;
    };

    IntactVue.prototype.$mount = function $mount(el, hydrating) {
        var _this4 = this;

        var oldTriggerFlag = this._shouldTrigger;
        this.__initMountedQueue();

        this.parentVNode = this.vNode.parentVNode = activeInstance && activeInstance.vNode;
        // disable intact async component
        this.inited = true;
        this.$el = this.init(null, this.vNode);
        this.vNode.dom = this.$el;
        this._vnode = {};
        var options = this.$options;
        var refElm = options._refElm;
        var parentElm = options._parentElm;
        // vue@2.5.18 and above does not need append the dom
        // vue will do this by itself
        if (parentElm) {
            if (refElm) {
                parentElm.insertBefore(this.$el, refElm);
            } else {
                parentElm.appendChild(this.$el);
            }
        }

        this.$el.__vue__ = this;

        this.mountedQueue.push(function () {
            _this4.mount();
        });

        this.__triggerMountedQueue();
        this._shouldTrigger = oldTriggerFlag;
    };

    IntactVue.prototype.$forceUpdate = function $forceUpdate() {
        var oldTriggerFlag = this._shouldTrigger;
        this.__initMountedQueue();

        var vNode = normalize(this.$vnode);
        var lastVNode = this.vNode;
        vNode.children = this;

        this.vNode = vNode;
        this.parentVNode = this.vNode.parentVNode = activeInstance && activeInstance.vNode;
        // Intact can change element when update, so we should re-assign it to elm, #4
        this.$vnode.elm = this.update(lastVNode, vNode);

        // force vue update intact component
        // reset it, because vue may set it to undefined
        this.$options._renderChildren = true;

        // let the vNode patchable for vue to register ref
        // this._vnode = this.vdt.vNode;
        // don't let vue to register ref, it will change className and so on
        // handle it there
        var lastRef = lastVNode.ref;
        var nextRef = vNode.ref;
        if (lastRef !== nextRef &&
        // if the string of the key is the same, do nothing
        !(lastRef && nextRef && lastRef.key === nextRef.key)) {
            if (lastRef) {
                lastRef(this, true);
            }
            if (nextRef) {
                nextRef(this);
            }
        }

        this.__triggerMountedQueue();
        this._shouldTrigger = oldTriggerFlag;
    };

    IntactVue.prototype.$destroy = function $destroy() {
        delete this.$el.__vue__;
        var parent = this.$parent;
        if (parent) {
            var children = parent.$children;
            if (children.length) {
                var index = children.indexOf(this);
                if (~index) {
                    children.splice(index, 1);
                }
            }
        }
        this.destroy();
    };

    // we should promise that all intact components have been mounted


    IntactVue.prototype.__initMountedQueue = function __initMountedQueue() {
        this._shouldTrigger = false;
        if (!mountedQueue || mountedQueue.done) {
            this._shouldTrigger = true;
            if (!this.mountedQueue || this.mountedQueue.done) {
                this._initMountedQueue();
            }
            mountedQueue = this.mountedQueue;
        } else {
            this.mountedQueue = mountedQueue;
        }
    };

    IntactVue.prototype.__triggerMountedQueue = function __triggerMountedQueue() {
        if (this._shouldTrigger) {
            if (this.mounted) {
                this._triggerMountedQueue();
            } else {
                // vue will call mouted hook after append the element
                // so we push to the queue to make it to be called immediately
                this.$options.mounted = [this._triggerMountedQueue];
                // this.$nextTick(() => {
                // if (this.destroyed) return;
                // this._triggerMountedQueue();
                // });
            }
            mountedQueue = null;
            this._shouldTrigger = false;
        }
    };

    IntactVue.prototype.__pushActiveInstance = function __pushActiveInstance() {
        this._prevActiveInstance = activeInstance;
        activeInstance = this;
    };

    IntactVue.prototype.__popActiveInstance = function __popActiveInstance() {
        activeInstance = this._prevActiveInstance;
        this._prevActiveInstance = null;
    };

    // mock api


    IntactVue.prototype.$on = function $on() {};

    IntactVue.prototype.$off = function $off() {};

    return IntactVue;
}(Intact);

IntactVue.cid = 'IntactVue';
IntactVue.options = extend({}, Vue.options);
IntactVue.functionalWrapper = functionalWrapper;
IntactVue.normalize = normalizeChildren;
IntactVue.prototype.$nextTick = $nextTick;
// for vue@2.1.8
IntactVue.prototype._updateFromParent = _updateFromParent;

// for compatibilty of IE <= 10
if (!Object.setPrototypeOf) {
    extend(IntactVue, Intact);
    // for Intact <= 2.4.4
    if (!IntactVue.template) {
        IntactVue.template = Intact.template;
    }
}

module.exports = IntactVue;
