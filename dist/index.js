import _classCallCheck from '@babel/runtime/helpers/classCallCheck';
import _createClass from '@babel/runtime/helpers/createClass';
import _get from '@babel/runtime/helpers/get';
import _inherits from '@babel/runtime/helpers/inherits';
import _possibleConstructorReturn from '@babel/runtime/helpers/possibleConstructorReturn';
import _getPrototypeOf from '@babel/runtime/helpers/getPrototypeOf';
import _defineProperty from '@babel/runtime/helpers/defineProperty';
import Intact from 'intact/dist';
import { createApp, h as h$1, KeepAlive, getCurrentInstance, cloneVNode, Text, Comment, Fragment, camelize, isVNode, vShow, isRef, createVNode } from 'vue';
import _toConsumableArray from '@babel/runtime/helpers/toConsumableArray';
import _typeof from '@babel/runtime/helpers/typeof';
import _objectWithoutProperties from '@babel/runtime/helpers/objectWithoutProperties';

function isIntactComponent(vNode) {
  // don't convert Intact functional component to Intact vNode,
  // because it's propTypes are missing
  return !!vNode.type.Component; // || vNode.type.cid === cid;
}
var cid = 'IntactVueNext';
var warn = console.warn;
var noop = function noop() {};
function silentWarn() {
  console.warn = noop;
}
function resetWarn() {
  console.warn = warn;
}

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var internals;
createApp({
  render: function render() {
    return h$1(KeepAlive, null, h$1(function () {
      var instance = getCurrentInstance();
      internals = instance.parent.ctx.renderer;
    }));
  }
}).mount(document.createElement('div'));
var _internals = internals,
    patch = _internals.p,
    unmount = _internals.um;
var ignorePropRegExp = /_ev[A-Z]/;

var Wrapper = /*#__PURE__*/function () {
  function Wrapper() {
    _classCallCheck(this, Wrapper);
  }

  _createClass(Wrapper, [{
    key: "init",
    value: function init(lastVNode, nextVNode) {
      // let the component destroy by itself
      this.destroyed = true;

      this._addProps(nextVNode);

      var vueVNode = nextVNode.props.vueVNode;
      var parentDom = this.parentDom || document.createDocumentFragment();
      patch(null, vueVNode, parentDom, null, getParentComponent(nextVNode));
      return vueVNode.el;
    }
  }, {
    key: "update",
    value: function update(lastVNode, nextVNode) {
      this._addProps(nextVNode);

      var vueVNode = nextVNode.props.vueVNode; // render(vueVNode, this.container);

      patch(lastVNode.props.vueVNode, vueVNode, this.parentDom, null, getParentComponent(nextVNode));
      return vueVNode.el;
    }
  }, {
    key: "destroy",
    value: function destroy(vNode) {
      // if we wrap a Intact functional component which return a Inact component,
      // the dom will be a comment node that will be replaced by InactVue,
      // in this case we set _unmount to let Inact never remove it,
      // and set doRemove to true to let Vue remove it instead.
      var vueVNode = vNode.props.vueVNode;
      var doRemove = false;

      if (vueVNode.type.cid === cid) {
        vNode.dom._unmount = noop;
        doRemove = true;
      }

      unmount(vNode.props.vueVNode, null, null, doRemove);
    } // maybe the props has been changed, so we change the vueVNode's data

  }, {
    key: "_addProps",
    value: function _addProps(vNode) {
      // for Intact reusing the dom
      this.vdt = {
        vNode: vNode
      };
      var props = vNode.props;
      var vueVNode = props.vueVNode; // if we reuse the vNode, clone it

      if (vueVNode.el) {
        vueVNode = cloneVNode(vueVNode);
      }

      var shouldAssign = true;

      for (var key in props) {
        if (key === 'vueVNode') continue;
        if (ignorePropRegExp.test(key)) continue;
        var vueProps = vueVNode.props;

        if (shouldAssign) {
          // props may be a EMPTY_OBJ, but we can not get its reference,
          // so we use a flag to handle it
          vueProps = vueVNode.props = _objectSpread({}, vueVNode.props);
          shouldAssign = false; // should change patchFlag to let Vue full diff props

          vueVNode.patchFlag |= 16;
        }

        var prop = props[key]; // is event

        if (key === 'className') {
          vueProps["class"] = prop;
        } else if (key === 'style') {
          vueProps.style = _objectSpread(_objectSpread({}, vueProps.style), prop);
        } else if (key.substr(0, 3) === 'ev-') {
          var name = key.substr(3);
          vueProps["on" + name[0].toUpperCase() + name.substr(1)] = prop;
        } else {
          vueProps[key] = prop;
        }
      }

      vNode.props = _objectSpread(_objectSpread({}, props), {}, {
        vueVNode: vueVNode
      });
    }
  }]);

  return Wrapper;
}();

function getParentComponent(vNode) {
  var parentVNode = vNode.parentVNode;

  while (parentVNode) {
    var children = parentVNode.children;

    if (children && children.vueInstance) {
      return children.vueInstance.$parent.$;
    }

    parentVNode = parentVNode.parentVNode;
  }
}

var h = Intact.Vdt.miss.h;
var _Intact$utils = Intact.utils,
    hasOwn = _Intact$utils.hasOwn,
    isArray = _Intact$utils.isArray,
    get = _Intact$utils.get,
    set = _Intact$utils.set,
    each = _Intact$utils.each,
    isString = _Intact$utils.isString,
    isFunction = _Intact$utils.isFunction;
function normalize(vNode) {
  if (vNode == null) return vNode;

  var type = _typeof(vNode);

  if (type === 'string' || type === 'number') return vNode; // is a intact vnode

  if (typeof vNode.type === 'number') return vNode;

  if (vNode.type === Text) {
    return vNode.children;
  }

  if (isIntactComponent(vNode)) {
    vNode = h(vNode.type.Component, normalizeProps(vNode), null, null, vNode.key, null);
  } else {
    // ignore comment vNode
    if (vNode.type === Comment) return null; // spread fragment

    if (vNode.type === Fragment) {
      return normalizeChildren(vNode.children);
    } // Vue will add key 0 to v-if, but Intact will ignore it, so we cast it string


    var key = vNode.key === 0 ? '0' : vNode.key;
    vNode = h(Wrapper, {
      vueVNode: vNode
    }, null, vNode.props && vNode.props["class"], key);
  } // tell Vue that this is a read only object, and don't reactive it


  vNode.__v_isReadonly = true;
  return vNode;
}
function normalizeChildren(vNodes) {
  var loop = function loop(vNodes) {
    if (Array.isArray(vNodes)) {
      var _ret = [];
      vNodes.forEach(function (vNode) {
        if (Array.isArray(vNode)) {
          _ret.push.apply(_ret, _toConsumableArray(loop(vNode)));
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
function normalizeProps(vNode) {
  var attrs = vNode.props;
  var slots = vNode.children;
  var Component = vNode.type.Component;
  var props = {};
  var propTypes = Component.propTypes;

  for (var key in attrs) {
    var value = attrs[key];

    switch (key) {
      case 'ref':
        break;

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
          var camelizedKey = camelize(key);
          value = normalizeBoolean(propTypes, key, camelizedKey, value);
          key = camelizedKey;
        }

        props[key] = value;
        break;
    }
  }

  normalizeSlots(slots, props);
  normalizeDirs(vNode.dirs, props);
  normalizeRef(vNode.ref, props);
  return props;
}

function normalizeBoolean(propTypes, key, camelizedKey, value) {
  if (hasOwn.call(propTypes, camelizedKey)) {
    var tmp;

    if (( // value is Boolean
    (tmp = propTypes[camelizedKey]) === Boolean || tmp && ( // value contains Boolean
    isArray(tmp) && tmp.indexOf(Boolean) > -1 || // value.type is Boolean
    tmp.type === Boolean || // value.type contains Boolean
    isArray(tmp.type) && tmp.type.indexOf(Boolean) > -1)) && (value === '' || value === key)) {
      value = true;
    }
  }

  return value;
}

function normalizeSlots(slots, props) {
  if (!slots) return; // is array children

  if (isArray(slots)) {
    return props.children = normalizeChildren(slots);
  } // is string


  if (isString(slots)) {
    return props.children = slots;
  } // the default slot maybe a scope slot, but we can not detect
  // whether it is or not, so we try to normalize it as children and
  // then treat it as a default scope slot too.


  if (slots["default"]) {
    var slot = slots["default"];

    try {
      // Vue will warn if we get property of undefined, we keep it silent
      silentWarn();
      props.children = normalizeChildren(ensureValidVNode(slot()));
      resetWarn();
    } catch (e) {}
  }

  var blocks;

  var _loop = function _loop(key) {
    if (key === '_') return "continue";
    var slot = slots[key];
    if (!blocks) blocks = {};

    blocks[key] = function (parent) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      // if the content is invalid, use parent instead
      // this is the default behavior of Vue
      var validSlotContent = ensureValidVNode(slot.apply(void 0, args));
      return validSlotContent ? normalizeChildren(validSlotContent) : parent();
    };
  };

  for (var key in slots) {
    var _ret2 = _loop(key);

    if (_ret2 === "continue") continue;
  }

  if (blocks) {
    props._blocks = blocks;
  }
}

var EMPTY_OBJ = {};

function normalizeEvents(props, key, value) {
  var name;
  var cb = value;

  var _isArray = isArray(value);

  var changeCallback = function changeCallback(propName) {
    return function (c, v) {
      var modifiersKey = "".concat(propName === 'value' ? 'model' : propName, "Modifiers");

      var _ref = props[modifiersKey] || EMPTY_OBJ,
          number = _ref.number,
          trim = _ref.trim;

      if (trim) {
        v = String(v).trim();
      } else if (number) {
        v = Number(v);
      }

      if (_isArray) {
        each(value, function (value) {
          return value(v);
        });
      } else {
        value(v);
      }
    };
  };

  if (key.startsWith('onUpdate:')) {
    var propName = camelize(key.substr(9));
    if (propName === 'modelValue') propName = 'value';
    name = "$change:".concat(propName);
    cb = changeCallback(propName);
  } else {
    key = key.substring(2);
    name = key[0].toLowerCase() + key.substring(1);
  } // if there is a $change:prop originally, set it as array


  name = "ev-".concat(name);

  if (props[name]) {
    props[name] = [].concat(props[name], cb);
  } else {
    props[name] = cb;
  }
}

function normalizeDirs(dirs, props) {
  if (!dirs) return;
  dirs.find(function (_ref2) {
    var dir = _ref2.dir,
        value = _ref2.value;

    // only handle v-show
    if (dir === vShow) {
      if (!value) {
        (props.style || (props.style = {})).display = 'none';
      }

      return true;
    }
  });
}

function normalizeRef(rawRef, props) {
  if (isFunction(rawRef)) props.ref = rawRef;else if (rawRef) {
    props.ref = function (i) {
      setRef(rawRef, i);
    };
  }
}

var onRE = /^on[^a-z]/;

var isOn = function isOn(key) {
  return onRE.test(key);
};

function ensureValidVNode(vNodes) {
  if (!Array.isArray(vNodes)) vNodes = [vNodes];
  return vNodes.some(function (child) {
    if (!isVNode(child)) {
      return true;
    }

    if (child.type === Comment) {
      return false;
    }

    if (child.type === Fragment && !ensureValidVNode(child.children)) {
      return false;
    }

    return true;
  }) ? vNodes : null;
}

function setRef(rawRef, value) {
  if (isArray(rawRef)) {
    rawRef.forEach(function (r, i) {
      return setRef(r, value);
    });
    return;
  }

  var owner = rawRef.i,
      ref = rawRef.r;
  var refs = !Object.keys(owner.refs).length ? owner.refs = {} : owner.refs;

  if (isString(ref)) {
    refs[ref] = value;
  } else if (isRef(ref)) {
    ref.value = value;
  } else if (isFunction(ref)) {
    ref(value, refs);
  } else {
    console.warn('Invalid template ref type:', value, "(".concat(_typeof(value), ")"));
  }
}

var isStringOrNumber = Intact.utils.isStringOrNumber;
function functionalWrapper(Component) {
  function Ctor(props, context) {
    if (context) {
      // invoked by Vue
      var forwardRef = props.forwardRef,
          rest = _objectWithoutProperties(props, ["forwardRef"]); // Vue will detect whether the slot is invoked outside or not,
      // but it does not affetch anything in here,
      // so we keep the warning silent


      silentWarn();

      var _props = normalizeProps({
        props: rest,
        children: context.slots,
        type: {
          Component: Component
        },
        ref: forwardRef
      });

      resetWarn();
      var vNode = Component(_props, true
      /* is in vue */
      );

      if (Array.isArray(vNode)) {
        return vNode.map(function (vNode) {
          return toVueVNode(vNode);
        });
      }

      return toVueVNode(vNode);
    } else {
      // invoked by Intact
      return Component(props);
    }
  }

  Ctor.cid = cid;
  return Ctor;
}

function toVueVNode(vNode) {
  if (isStringOrNumber(vNode)) return vNode;

  if (vNode) {
    return h$1(vNode.tag, vNode.props);
  }
}

var hooks = Intact.Vdt.miss.hooks;

if (hooks) {
  hooks.beforeInsert = function (vNode) {
    var dom = vNode.dom;
    var parent = vNode.parentVNode;
    var i;

    while (parent) {
      // find Intact Component which renders by Vue
      if ((i = parent.tag) && i.cid === cid && (i = parent.children.vueInstance)) {
        var vnode = i.$.vnode;
        var parentComponent = i.$parent.$;
        setScopeId(dom, vnode.scopeId, vnode, parentComponent);
        break;
      } else {
        parent = parent.parentVNode;
      }
    }
  };
}

function setScopeId(el, scopeId, vnode, parentComponent) {
  if (scopeId) {
    hostSetScopeId(el, scopeId);
  }

  if (parentComponent) {
    var treeOwnerId = parentComponent.type.__scopeId; // vnode's own scopeId and the current patched component's scopeId is
    // different - this is a slot content node.

    if (treeOwnerId && treeOwnerId !== scopeId) {
      hostSetScopeId(el, treeOwnerId + '-s');
    }

    var subTree = parentComponent.subTree;

    if (vnode === subTree) {
      setScopeId(el, parentComponent.vnode.scopeId, parentComponent.vnode, parentComponent.parent);
    }
  }
}

function hostSetScopeId(el, scopeId) {
  el.setAttribute(scopeId, '');
}

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }
var activeInstance;
var mountedQueue;
var pendingCount = 0;

var IntactVue = /*#__PURE__*/function (_Intact) {
  _inherits(IntactVue, _Intact);

  var _super = _createSuper(IntactVue);

  function IntactVue() {
    _classCallCheck(this, IntactVue);

    return _super.apply(this, arguments);
  }

  _createClass(IntactVue, [{
    key: "init",
    value: function init(lastVNode, nextVNode) {
      pushActiveInstance(this);

      var element = _get(_getPrototypeOf(IntactVue.prototype), "init", this).call(this, lastVNode, nextVNode);

      popActiveInstance();
      return element;
    }
  }, {
    key: "update",
    value: function update(lastVNode, nextVNode, fromPending) {
      var _this = this;

      var update = function update() {
        pushActiveInstance(_this);

        var element = _get(_getPrototypeOf(IntactVue.prototype), "update", _this).call(_this, lastVNode, nextVNode, fromPending);

        popActiveInstance();
        return element;
      };

      if (!this._isVue) return update();
      var element = update(); // should update vnode.el, becasue Intact may change dom after it updated

      if (this._hasCalledMountd) {
        this._updateVNodeEl();
      }

      return element;
    } // we should promise that all intact components have been mounted

  }, {
    key: "__initMountedQueue",
    value: function __initMountedQueue() {
      if (!this.__updating) {
        ++pendingCount;
      }

      if (!mountedQueue || mountedQueue.done) {
        if (!this.mountedQueue || this.mountedQueue.done) {
          this._initMountedQueue();
        }

        mountedQueue = this.mountedQueue;
      } else {
        this.mountedQueue = mountedQueue;
      }
    }
  }, {
    key: "__triggerMountedQueue",
    value: function __triggerMountedQueue() {
      if (! --pendingCount) {
        this._triggerMountedQueue();

        mountedQueue = null;
      }
    }
  }, {
    key: "_updateVNodeEl",
    value: function _updateVNodeEl() {
      var element = this.element;
      var vueInstance = this.vueInstance.$;
      var vnode;

      do {
        vnode = vueInstance.vnode;
        vueInstance.subTree.el = vnode.el = element;
        vueInstance = vueInstance.parent;
      } while (vueInstance && vueInstance.subTree === vnode);
    }
  }], [{
    key: "__vccOpts",
    get: function get() {
      var Component = this;

      if (Component.hasOwnProperty('__cache')) {
        return Component.__cache;
      }

      return Component.__cache = {
        Component: Component,
        setup: function setup(props, ctx) {
          var setupState = {
            instance: null
          };
          var proxy = new Proxy(setupState, {
            get: function get(_ref, key) {
              var instance = _ref.instance;
              if (key === '__v_isReactive') return true;
              if (!instance) return null;
              if (key === 'instance') return instance;
              return instance[key];
            },
            set: function set(setupState, key, value) {
              if (key === 'instance') return Reflect.set(setupState, key, value);
              return Reflect.set(setupState.instance, key, value);
            },
            getOwnPropertyDescriptor: function getOwnPropertyDescriptor() {
              return {
                value: undefined,
                writable: true,
                enumerable: true,
                configurable: true
              };
            },
            ownKeys: function ownKeys() {
              return [];
            }
          });
          return proxy;
        },
        render: function render(proxyToUse, renderCache, props, setupState, data, ctx) {
          var vueInstance = proxyToUse.$;
          var vNode = normalize(vueInstance.vnode);
          var instance = setupState.instance;
          var isInit = false;

          if (!instance) {
            isInit = true;
            instance = setupState.instance = new Component(vNode.props);
            instance._isVue = true;
          }

          vNode.children = instance;
          instance.vueInstance = proxyToUse;
          instance.parentVNode = vNode.parentVNode = activeInstance && activeInstance.vNode;
          var lastVNode = instance.vNode;
          instance.vNode = vNode;

          instance.__initMountedQueue();

          if (isInit) {
            // disable intact async component
            instance.inited = true;
            vNode.dom = instance.init(null, vNode);
            instance.mountedQueue.push(function () {
              instance.mount();
            });
          } else {
            instance.__updating = true;
            vNode.dom = instance.update(lastVNode, vNode);
          }

          return createVNode(Comment, null, 'intact-vue-placeholer');
        },
        mounted: function mounted() {
          var el = this.$el;
          var dom = this.element;
          el.parentNode.replaceChild(dom, el); // update vnode.el

          this._updateVNodeEl(); // If we trigger a update in a update lifecyle,
          // the order of hooks is beforeMount -> beforeUpdate -> mountd -> updated,
          // in this case, we should not updateVNodeEl in beforeUpdated,
          // so we add a flag to skip it


          this._hasCalledMountd = true;

          this.__triggerMountedQueue();
        },
        updated: function updated() {
          this.__updating = false;

          this.__triggerMountedQueue();
        },
        beforeUnmount: function beforeUnmount() {
          this.destroy();
        }
      };
    }
  }]);

  return IntactVue;
}(Intact);

_defineProperty(IntactVue, "functionalWrapper", functionalWrapper);

_defineProperty(IntactVue, "normalize", normalizeChildren);

_defineProperty(IntactVue, "cid", cid);
var stack = [];
var index = -1;

function pushActiveInstance(instance) {
  stack.push(instance);
  index++;
  activeInstance = instance;
}

function popActiveInstance() {
  stack.pop();
  index--;
  activeInstance = stack[index];
}

export default IntactVue;
