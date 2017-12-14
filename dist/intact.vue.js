(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('vue'), require('intact/dist/intact')) :
	typeof define === 'function' && define.amd ? define(['vue', 'intact/dist/intact'], factory) :
	(global.Intact = factory(global.Vue,global.Intact));
}(this, (function (Vue,Intact) { 'use strict';

Vue = Vue && Vue.hasOwnProperty('default') ? Vue['default'] : Vue;
Intact = Intact && Intact.hasOwnProperty('default') ? Intact['default'] : Intact;

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
    return vNodes;
}

function normalize(vNode) {
    if (isIntactComponent(vNode)) {
        var options = vNode.componentOptions;
        return h(options.Ctor, normalizeProps(vNode), null, null, vNode.key, vNode.ref);
    } else if (vNode.text !== undefined) {
        return vNode.text;
    }
    return h(Wrapper, { vueVNode: vNode }, null, className(vNode));
}

function normalizeProps(vNode) {
    var componentOptions = vNode.componentOptions;
    var data = vNode.data;
    var attrs = data.attrs;
    var propTypes = componentOptions.Ctor.propTypes;
    var props = {};

    if (attrs) {
        for (var key in attrs) {
            if (key === 'staticClass' || key === 'class') continue;
            var value = attrs[key];
            if (propTypes && propTypes[key] === Boolean && value === '') {
                value = true;
            }
            props[key] = value;
        }
    }

    // add className
    props.className = className(vNode);

    // if exists v-model
    if (data.model) {
        props.value = data.model.value;
    }

    for (var _key in componentOptions.listeners) {
        // is a v-model directive of vue
        if (_key === 'input') {
            props['ev-$change:value'] = function (c, v) {
                componentOptions.listeners.input(v);
            };
        } else {
            props['ev-' + _key] = componentOptions.listeners[_key];
        }
    }

    // handle children and blocks
    var slots = resolveSlots(componentOptions.children);
    Object.assign(props, getChildrenAndBlocks(slots));

    return props;
}

function getChildrenAndBlocks(slots) {
    var d = slots.default,
        rest = objectWithoutProperties(slots, ['default']);

    var blocks = void 0;
    if (rest) {
        blocks = {};

        var _loop = function _loop(key) {
            blocks[key] = function () {
                return normalizeChildren(rest[key]);
            };
        };

        for (var key in rest) {
            _loop(key);
        }
    }

    return {
        children: normalizeChildren(d),
        _blocks: blocks
    };
}

function functionalWrapper(Component) {
    function Ctor(props) {
        Component(props);
    }

    Ctor.options = {
        functional: true,
        render: function render(h, props) {
            var data = props.parent.$data;
            var _props = {
                children: props.children,
                _context: {
                    data: {
                        get: function get$$1(name) {
                            return _get(data, name);
                        },
                        set: function set$$1(name, value) {
                            _set(data, name, value);
                        }
                    }
                }
            };
            for (var key in props.data.attrs) {
                _props[key] = props.data.attrs[key];
            }
            var _className = className(props);
            if (_className) {
                _props.className = _className;
            }
            var vNode = Component(_props);
            var attrs = {};
            var __props = { attrs: attrs };
            for (var _key2 in vNode.props) {
                if (~['children', '_context', 'className'].indexOf(_key2)) continue;
                attrs[_key2] = vNode.props[_key2];
            }
            if (vNode.props.className) {
                __props.staticClass = vNode.props.className;
            }
            return h(vNode.tag, __props, vNode.props.children);
        }
    };

    Ctor.cid = 'IntactFunctionalComponent';

    return Ctor;
}

// export class MockVueComponent {
// static options = Vue.options;
// // mock api
// $on() {}
// }

var Wrapper = function () {
    function Wrapper() {
        classCallCheck(this, Wrapper);
    }

    Wrapper.prototype.init = function init(lastVNode, nextVNode) {
        return patch(null, nextVNode.props.vueVNode, false, false, this.parentDom);
    };

    Wrapper.prototype.update = function update(lastVNode, nextVNode) {
        return patch(lastVNode.props.vueVNode, nextVNode.props.vueVNode, false, false, this.parentDom);
    };

    Wrapper.prototype.destroy = function destroy(vNode) {
        patch(vNode.props.vueVNode, null);
    };

    return Wrapper;
}();

function className(vNode) {
    var className = void 0;
    var data = vNode.data;
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
var init = Vue.prototype._init;

var IntactVue = function (_Intact) {
    inherits(IntactVue, _Intact);

    function IntactVue(options) {
        classCallCheck(this, IntactVue);

        var parentVNode = options && options._parentVnode;
        if (parentVNode) {
            var vNode = normalize(parentVNode);

            // inject hook
            var _this = possibleConstructorReturn(this, _Intact.call(this, vNode.props));

            options.mounted = [_this.mount];

            _this.$options = options;
            _this.$vnode = parentVNode;

            _this.parentVNode = vNode;
            vNode.children = _this;
        } else {
            var _this = possibleConstructorReturn(this, _Intact.call(this, options));
        }
        return possibleConstructorReturn(_this);
    }

    IntactVue.prototype.$mount = function $mount(el, hydrating) {
        this.$el = this.init(null, this.parentVNode);
        this._vnode = {};
        this.$options._parentElm.appendChild(this.$el);
    };

    IntactVue.prototype.$forceUpdate = function $forceUpdate() {
        this._initMountedQueue();

        var vNode = normalize(this.$vnode);
        vNode.children = this;

        this.update(this.parentVNode, vNode);
        this.parentVNode = vNode;

        this._triggerMountedQueue();
    };

    IntactVue.prototype.$destroy = function $destroy() {
        this.destroy();
    };

    // mock api


    IntactVue.prototype.$on = function $on() {};

    IntactVue.prototype.$off = function $off() {};

    return IntactVue;
}(Intact);

IntactVue.cid = 'IntactVue';
IntactVue.options = Object.assign({}, Vue.options);
IntactVue.functionalWrapper = functionalWrapper;

return IntactVue;

})));
