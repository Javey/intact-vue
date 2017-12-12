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

function normalizeChildren(vNodes) {
    if (vNodes) {
        var ret = [];
        vNodes.forEach(function (vNode) {
            if (isIntactComponent(vNode)) {
                var options = vNode.componentOptions;
                vNode = h(options.Ctor, Object.assign({ className: className(vNode) }, vNode.data.attrs), normalizeChildren(options.children), null, vNode.key, vNode.ref);
            } else {
                vNode = h(Wrapper, { vueVNode: vNode });
            }
            ret.push(vNode);
        });
        return ret;
    }
    return vNodes;
}

function attachProps(vNode) {
    var componentOptions = vNode.componentOptions;
    var data = vNode.data;
    var props = Object.assign({
        // children: normalizeChildren(componentOptions.children)
    }, data.attrs);

    // if exists v-model
    if (data.model) {
        props.value = data.model.value;
    }

    for (var key in componentOptions.listeners) {
        // is a v-model directive of vue
        if (key === 'input') {
            props['ev-$change:value'] = function (c, v) {
                componentOptions.listeners.input(v);
            };
        } else {
            props['ev-' + key] = componentOptions.listeners[key];
        }
    }

    vNode.props = props;

    return props;
}

var MockVueComponent = function () {
    function MockVueComponent() {
        classCallCheck(this, MockVueComponent);
    }

    // mock api
    MockVueComponent.prototype.$on = function $on() {};

    return MockVueComponent;
}();

MockVueComponent.options = Vue.options;

var Wrapper = function () {
    function Wrapper() {
        classCallCheck(this, Wrapper);
    }

    Wrapper.prototype.init = function init(lastVNode, nextVNode) {
        return patch(null, nextVNode.props.vueVNode);
    };

    Wrapper.prototype.update = function update(lastVNode, nextVNode) {
        return patch(lastVNode.props.vueVNode, nextVNode.props.vueVNode);
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

// for webpack alias Intact to IntactVue
var init = Vue.prototype._init;

var IntactVue = function (_Intact) {
    inherits(IntactVue, _Intact);

    function IntactVue(options) {
        classCallCheck(this, IntactVue);

        var parentVNode = options._parentVnode;
        if (parentVNode) {

            // get slots
            var _this = possibleConstructorReturn(this, _Intact.call(this, attachProps(parentVNode)));

            var vm = new MockVueComponent();
            init.call(vm, options);
            _this.$slots = vm.$slots;
            _this._handleSlots();
            _this._isVue = vm._isVue;

            // inject hook
            options.mounted = [_this.mount];

            _this.$options = options;
            _this.$vnode = parentVNode;

            _this.$lastVNode = parentVNode;
            _this.parentVNode = parentVNode;
        } else {
            var _this = possibleConstructorReturn(this, _Intact.call(this, options));
        }
        return possibleConstructorReturn(_this);
    }

    IntactVue.prototype.$mount = function $mount(el, hydrating) {
        this.$el = this.init();
        this._vnode = {};
        this.$options._parentElm.appendChild(this.$el);
    };

    IntactVue.prototype.$forceUpdate = function $forceUpdate() {
        this._initMountedQueue();
        attachProps(this.$vnode);
        this._handleSlots();
        this.update(this.$lastVNode, this.$vnode);
        this.$lastVNode = this.$vnode;
        this.parentVNode = this.$vnode;
        this._triggerMountedQueue();
    };

    IntactVue.prototype.$destroy = function $destroy() {
        this.destroy();
    };

    IntactVue.prototype._handleSlots = function _handleSlots() {
        var _$slots = this.$slots,
            d = _$slots.default,
            rest = objectWithoutProperties(_$slots, ['default']);

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
        this.set({
            children: normalizeChildren(d),
            _blocks: blocks
        }, { update: false });
    };

    return IntactVue;
}(Intact);

IntactVue.cid = 'IntactVue';
IntactVue.options = Object.assign({}, Vue.options);

return IntactVue;

})));
