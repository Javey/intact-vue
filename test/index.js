import {createApp, h, getCurrentInstance} from 'vue';
import Intact from '../src/IntactVue';
import Normalize from './normalize.vue';
import Test1 from './test1.vue';
import Test3 from './test3.vue';

const {isFunction} = Intact.utils;

let vm;

function render(template, components, data = {}, methods = {}, lifecycle = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return vm = createApp({
        data: isFunction(data) ? data : () => data,
        components,
        methods,
        [typeof template === 'function' ? 'render' : 'template']: template,
        ...lifecycle,
    }).mount(container);
}

function createIntactComponent(template, methods) {
    class Component extends Intact {
        get template() { return template; }
    }
    if (methods) {
        Object.assign(Component.prototype, methods);
    }

    return Component;
}

function dispatchEvent(target, eventName) {
    let event;
    if (document.createEvent) {
        event = document.createEvent('Event');
        event.initEvent(eventName, true, true);
    } else if (document.createEventObject) {
        event = document.createEventObject();
        return target.fireEvent(`on${eventName}`, event);
    } else if (typeof CustomEvent !== 'undefined') {
        event = new CustomEvent(eventName);
    }
    target.dispatchEvent(event);
}

const simpleTemplate = '<div>Intact Component</div>';
const SimpleIntactComponent = createIntactComponent(simpleTemplate);
const ChildrenIntactComponent = createIntactComponent(`<div class={self.get('className')} style={self.get('style')}>{self.get('children')}</div>`);
const PropsIntactComponent = createIntactComponent(`<div>a: {self.get('a')} b: {self.get('b')}</div>`);

function reset() {
    document.body.removeChild(vm.$el.parentElement);
}

function nextTick() {
    return new Promise(resolve => {
        vm.$nextTick(() => resolve());
    });
}

describe('Unit Test', () => {
    // afterEach(reset);

    describe('Render', () => {
        it('render intact component in vue', async () => {
            render('<C ref="a"/>', {C: SimpleIntactComponent});
            await nextTick();
            expect(vm.$el.outerHTML).to.eql(simpleTemplate);
        });

        it('render intact in vue element', async () => {
            render('<div><C/></div>', {C: SimpleIntactComponent});
            await nextTick();
            expect(vm.$el.outerHTML).to.eql(`<div>${simpleTemplate}</div>`);
        });

        it('render intact in vue component', async () => {
            render(
                '<VueComponent><C/></VueComponent>',
                {
                    VueComponent: {
                        template: `<div><slot></slot></div>`
                    },
                    C: SimpleIntactComponent
                }
            );

            await nextTick();
            expect(vm.$el.outerHTML).to.eql(`<div>${simpleTemplate}</div>`);
        });

        it('render vue element in intact', async () => {
            render('<C><div>vue</div></C>', {C: ChildrenIntactComponent});
            await nextTick();
            expect(vm.$el.outerHTML).to.eql(`<div><div>vue</div></div>`);
        });

        it('render vue component in intact', async () => {
            render('<C><VueComponent /></C>', {
                C: ChildrenIntactComponent,
                VueComponent: {
                    template: `<div>vue component</div>`
                }
            });
            await nextTick();
            expect(vm.$el.outerHTML).to.eql(`<div><div>vue component</div></div>`);
        });

        it('render nested vue and intact', async () => {
            render('<C><V><C><V></V></C></V></C>', {
                C: ChildrenIntactComponent,
                V: {
                    template: `<div><slot></slot></div>`
                }
            });
            await nextTick();
            expect(vm.$el.outerHTML).to.eql(`<div><div><div><div></div></div></div></div>`);
        });

        it('render nested component in template', async () => {
            render('<C class="a"><V><div></div></V></C>', {
                C: ChildrenIntactComponent,
                V: {
                    template: `<C class="b"><slot></slot></C>`,
                    components: {
                        C: ChildrenIntactComponent,
                    }
                }
            });

            await nextTick();
            expect(vm.$el.outerHTML).to.eql(`<div class="a"><div class="b"><div></div></div></div>`);
        });

        it('render with props', async () => {
            render('<C a="a" :b="b" />', {
                C: PropsIntactComponent
            }, {b: 1});

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div>a: a b: 1</div>');
        });

        it('render Boolean type prop', async () => {
            const Component = createIntactComponent(`
                var data = {
                    a: self.get('a'),
                    b: self.get('b'),
                    c: self.get('c'),
                    d: self.get('d')
                };
                <div>{JSON.stringify(data)}</div>`
            );

            Component.propTypes = {
                a: Boolean,
                b: {
                    type: Boolean,
                    required: true,
                },
                c: [Number, Boolean],
                d: {
                    type: [Number, Boolean],
                    required: true,
                }
            };
            render('<C a b c d="d" />', {C: Component});

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div>{"a":true,"b":true,"c":true,"d":true}</div>');
        });

        it('render with event', async () => {
            render('<div><C @click="onClick" />{{ a }}</div>', {
                C: createIntactComponent(`<div ev-click={self.onClick.bind(self)}>click</div>`, {
                    onClick() {
                        this.trigger('click');
                    }
                })
            }, {a: 1}, {
                onClick() {
                    this.a++;
                }
            });

            await nextTick();
            dispatchEvent(vm.$el.firstChild.firstChild, 'click');
            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div><div>click</div>2</div>');
        });

        it('render with multiple events which event names are the same', async () => {
            const click = sinon.spy(() => console.log('click'));
            const changeValue = sinon.spy();
            const IntactComponent = createIntactComponent(`<div ev-click={self.onClick}>{self.get('value')}</div>`, {
                onClick() {
                    this.set('value', 'click');
                    this.trigger('click');
                }
            });
            render('<div><C @click="click" v-model="value" />{{ value }}</div>', {
                C: {
                    template: `<IntactComponent v-model="value1"
                        @click="click"
                        @update:modelValue="changeValue"
                        @$change:value="changeValue"
                    />`,
                    components: {
                        IntactComponent
                    },
                    methods: {click, changeValue},
                    props: {
                        modelValue: {
                            required: true
                        }
                    },
                    emits: ['update:modelValue'],
                    data() {
                        return {
                            value1: this.value
                        }
                    },
                    watch: {
                        value1(v) {
                            this.value = v;
                            this.$emit('update:modelValue', v);
                        }
                    }
                }
            }, {value: "test"}, {click});

            await nextTick();
            dispatchEvent(vm.$el.firstChild, 'click');
            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div>click</div>click</div>');
            expect(click.callCount).to.eql(2);
            expect(changeValue.callCount).to.eql(2);
        });

        it('render with slots', async () => {
            render('<C><template #footer><div>footer</div></template><div>children</div></C>', {
                C: createIntactComponent(`<div>{self.get('children')}<b:footer></b:footer></div>`)
            });

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div><div>children</div><div>footer</div></div>');
        });

        it('render undefined slot', async () => {
            render('<C><template #footer><div><C>test</C></div></template></C>', {
                C: createIntactComponent(`<div>{self.get('children')}</div>`)
            });

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div></div>');
            reset();

            render('<C><C><template #footer><div>test</div></template></C></C>', {
                C: createIntactComponent(`<div>{self.get('children')}</div>`)
            });

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div><div></div></div>');
        });

        it('render with scoped slots', async () => {
            render('<C><template v-slot="{test}"><div>{{ test }}</div></template></C>', {
                // C: createIntactComponent(`<div>{self.get('default')('test')}</div>`)
                C: createIntactComponent(`<div><b:default args={[{test: 'test'}]} /></div>`)
            });

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div><div>test</div></div>');
        });

        it('should silent when we try to treat a default scope slot as children', async () => {
            const consoleWarn = console.warn;
            const warn = console.warn = sinon.spy();

            render(`<C><template v-slot="item">{{ item.a }}</template></C>`, {
                C: createIntactComponent(`<div><b:default args={[{a: 1}]} /></div>`)
            });

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div>1</div>');
            expect(warn.callCount).to.eql(0);
            console.warn = consoleWarn;
        });

        it('ignore empty slot in vue, this is default behavior of vue', async () => {
            render('<C><template v-slot:slot></template></C>', {
                C: createIntactComponent(`<div><b:slot>test</b:slot></div>`)
            });

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div>test</div>');
        });

        it('render functional component which wrap intact component', async () => {
            const h = Intact.Vdt.miss.h;
            const Component = Intact.functionalWrapper(function(props) {
                return h(ChildrenIntactComponent, props);
            });
            render('<C class="a" :a="1">test</C>', {
                C: Component
            });

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div class="a">test</div>');
        });

        it('render functional component which return multiple vNodes', async () => {
            const h = Intact.Vdt.miss.h;
            const Component = Intact.functionalWrapper(function(props) {
                return [
                    h(ChildrenIntactComponent, props),
                    h(ChildrenIntactComponent, null, 'two')
                ];
            });
            render('<div><C class="a" :a="1" :forwardRef="i => a = i" key="a">test</C></div>', {
                C: Component
            });

            await nextTick();
            expect(vm.a.element.innerHTML).to.eql('test');
            expect(vm.$el.outerHTML).be.eql('<div><div class="a">test</div><div>two</div></div>');
        });

        it('render blocks in functional component', async () => {
            const h = Intact.Vdt.miss.h;
            const Component = Intact.functionalWrapper(props => {
                return h(createIntactComponent(`<div><b:test /></div>`), props);
            });
            render('<C ref="test"><template v-slot:test><span>test</span></template></C>', {
                C: Component
            }, {test: 1});

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div><span>test</span></div>');
        });

        it('render functional components as Intact component\'s children', async () => {
            const h = Intact.Vdt.miss.h;
            const Component = Intact.functionalWrapper(props => {
                return h(SimpleIntactComponent);
            });
            render('<C><Component /></C>', {
                C: ChildrenIntactComponent,
                Component,
            });

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div>Intact Component</div></div>');
        });

        it('render style and class', async () => {
            render(`<C style="color: red;" :style="{fontSize: '12px'}" class="a" :class="{b: true}"/>`, {
                C: createIntactComponent(`<div style={self.get('style')} class={self.get('className')}>test</div>`)
            });

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div class="a b" style="color: red; font-size: 12px;">test</div>');
        });

        it('render async intact component', async () => {
            render('<C />', {
                C: createIntactComponent('<div>test</div>', {
                    _init() {
                        return new Promise((resolve) => {
                            resolve();
                        });
                    }
                })
            });

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div>test</div>');
        });

        it('render nested array children', async () => {
            const C = createIntactComponent(`<div>{self.get('content')}</div>`);
            render(function() {
                const content = Intact.normalize([
                    h('div', null, '1'),
                    [
                        h('div', null, '2'),
                        h('div', null, '3')
                    ]
                ]);
                return h(C, {content});
            });

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div>1</div><div>2</div><div>3</div></div>');
        });

        it('render normalize vNode with propperty', async () => {
            const C = Normalize;
            // no [Vue warn]
            render(function() {
                return h(C);
            });

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div>test</div><div></div></div>');
        });

        it('render vue vNodes as children', async () => {
            render('<C :children="children" />', {
                C: ChildrenIntactComponent
            }, function() {
                return {
                    children: Intact.normalize(h('div', null, 'test'))
                }
            });

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div>test</div></div>');
        });

        it('render props which name is hyphenated style', async () => {
            const Component = createIntactComponent(`<div ev-click={self.click}>{self.get('userName')}</div>`, {
                click() {
                    this.trigger('clickComponent');
                }
            });
            Component.propTypes = {userName: String};
            const click = sinon.spy();
            render('<C user-name="Javey" @click-component="click" />', {
                C: Component,
            }, {}, {click});

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div>Javey</div>');
            vm.$el.click();
            expect(click.callCount).to.eql(1);
        });

        it('should not affect render Intact functional component', async () => {
            const h = Intact.Vdt.miss.h;
            render('<C />', {
                C: createIntactComponent(`<C />`, {
                    _init() {
                        this.C = Intact.functionalWrapper(function() {
                            return h('div', null, 'test');
                        });
                    }
                })
            });

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div>test</div>');
        });
    });

    describe('Update', () => {
        it('insert removed element should keep the original order', async () => {
            render('<div><C v-if="show">1</C><C>2</C></div>', {
                C: ChildrenIntactComponent
            }, {show: false});

            vm.show = true;

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div><div>1</div><div>2</div></div>');
        });

        it('insert keyed child before non-keyed child', async () => {
            render('<div><div v-if="show"><C>1</C></div><div v-else><C key="1">2</C><D /></div></div>', {
                C: ChildrenIntactComponent,
                D: SimpleIntactComponent
            }, {show: true});

            vm.show = false;

            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div><div><div>2</div><div>Intact Component</div></div></div>');
        });

        it('insert keyed vue element before non-keyed element in Intact component', async () => {
            const IntactComponent = createIntactComponent(`
                <div>{self.get('children')}<C ref="c" /></div>
            `, {_init() {
                this.C = SimpleIntactComponent;
            }});
            render(`
                <C ref="c">
                    <div key="test" v-if="show">test2</div>
                </C>
            `, {
                C: IntactComponent,
            }, {show: false});

            vm.$refs.c.refs.c.test = true;
            vm.show = true;

            await nextTick();
            expect(vm.$refs.c.refs.c.test).to.be.true;
        });

        it('update keyed functional component children', async () => {
            // v-if / v-else will add different key by Vue
            const h = Intact.Vdt.miss.h;
            render(`
                <C>
                    <div>
                        <C :forwardRef="i => a = i" v-if="show">1</C>
                        <C :forwardRef="i => b = i" v-else>2</C>
                    </div>
                </C>
                `, {
                C: Intact.functionalWrapper(function Wrapper(props) {
                    return h(ChildrenIntactComponent, props);
                }),
            }, {show: true});

            await nextTick();
            const a = vm.a;
            vm.show = false;
            await nextTick();
            const b = vm.b;
            expect(a === b).be.false;
            expect(vm.$el.innerHTML).be.eql('<div><div>2</div></div>');
        });

        it('diff IntactComponent with vue element', async () => {
            const C = ChildrenIntactComponent;
            render(function() {
                return h(C, null, this.show ? h(C, null, '1') : h('p', null, '2'));
            }, null,  function() {
                return {
                    show: false
                }
            });

            vm.show = true;
            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div><div>1</div></div>');

            vm.show = false;
            await nextTick();
            expect(vm.$el.outerHTML).be.eql('<div><p>2</p></div>');
        });

        it('should update ref', async () => {
            const C = ChildrenIntactComponent;
            render(function() {
                return h('div', null, this.show ? h(C, null, 1) : h(C, {ref: 'a'}, 2));
            }, null, {show: true});

            vm.show = false;
            await nextTick();
            expect(vm.$refs.a.inited).be.true;
        });

        it('should update ref in for', async () => {
            render(`
                <div>
                    <C v-for="(item, index) in data"
                        :key="index"
                        :ref="'test' + index"
                        :index="item.value"
                    >{{ item.value }}</C>
                </div>
            `, {
                C: ChildrenIntactComponent
            }, {data: []}, {add(index) {
                this.data.push({value: this.data.length + 1});
            }});

            vm.data.push({value: 1});
            await nextTick();
            vm.data.push({value: 2});
            await nextTick();
            vm.data.push({value: 3});
            await nextTick();
            [0, 1, 2].forEach((index) => {
                expect(vm.$refs['test' + index].get('index')).to.eql(index + 1);
            });
        });

        it('should watch vue component nested into intact component', async () => {
            const handler = sinon.spy();
            render('<C><D :a="a" /><div @click="add" ref="add">click</div></C>', {
                C: ChildrenIntactComponent,
                // C: {template: '<div><slot></slot></div>'},
                D: {
                    template: '<div>{{ a.join(",") }}</div>',
                    props: {
                        a: {
                            default: [],
                            type: Array,
                        }
                    },
                    watch: {
                        a: {
                            immediate: true,
                            deep: true,
                            handler,
                        }
                    }
                }
            }, {a: [2]}, {add() { this.a.push(2) }});

            await nextTick();
            expect(handler.callCount).to.eql(1);
            vm.$refs.add.click();
            await nextTick();
            expect(handler.callCount).to.eql(2);
            expect(vm.$el.innerHTML).to.eql('<div>2,2</div><div>click</div>');
        });

        it('should update correctly even if intact has changed type of element', async () => {
            const C = createIntactComponent(`if (!self.get('total')) return; <div>component</div>`);
            render(function() {
                return h('div', null, this.show ?
                    h('div', null, h(C, {total: this.total})) :
                    h('div')
                );
            }, null, {show: true, total: 0});

            vm.total = 1;
            await nextTick();
            vm.show = false;
            await nextTick();
            expect(vm.$el.outerHTML).eql('<div><div></div></div>');
        });

        it('update vue element which has been reused across multiple renders', async () => {
            render(`<C ref="c"><div>test</div></C>`, {
                C: createIntactComponent(`<div>{self.get('children')}{self.get('children')}</div>`)
            });
            vm.$forceUpdate();
            await nextTick();
            expect(vm.$el.outerHTML).eql('<div><div>test</div><div>test</div></div>');

            vm.$refs.c.update();
            expect(vm.$el.outerHTML).eql('<div><div>test</div><div>test</div></div>');
        });

        it('call intact show method to create elements that contains vue component, should get the $parent in vue component', (done) => {
            render(`<C ref="c"><V /></C>`, {
                C: createIntactComponent(`<div>{self.get('show') ? self.get('children') : undefined}</div>`),
                V: {
                    template: `<div>test</div>`,
                    beforeCreate() {
                        expect(this.$parent === vm).to.be.true;
                        done();
                    }
                }
            });

            vm.$refs.c.set('show', true);
        });

        it('should update vNode.el of Vue if Intact component updated and return the different dom', async () => {
            const C = createIntactComponent(`
                const show = self.get('show');
                if (!show) return;
                <div>show</div>
            `, {
                defaults() {
                    return {show: true};
                },

                hide() {
                    this.set('show', false);
                    this.trigger('hide');
                }
            });

            render(`<div><C v-if="show" ref="c" @hide="hide" /></div>`, {C}, {show: true}, {
                hide() {
                    this.show = false;
                }
            });

            vm.$refs.c.hide();

            await nextTick();
            expect(vm.$el.innerHTML).to.eql('<!--v-if-->');
        });

        it('call update method on init in Intact component', async () => {
            render('<C />', {
                C: createIntactComponent(`<div>test</div>`, {
                    _init() {
                        this.update();
                    }
                })
            });

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div>test</div>');
        });

        it('should call update method of vue to update Intact functional component children that create by createVNode', async () => {
            const consoleWarn = console.warn;
            const warn = console.warn = sinon.spy(consoleWarn);
            const C = Intact.functionalWrapper(function(props) {
                return props.children;
            });
            const D = createIntactComponent(`const children = self.get('children'); <div>{children}{children}</div>`);
            render(function(ctx) {
                return h(D, null, {
                    default() {
                        return h(C, null, {
                            default() {
                                return ctx.test;
                            }
                        });
                    }
                });
            }, null, {test: 1});

            vm.test = 2;
            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div>22</div>');
            expect(warn.callCount).to.eql(0);
            console.warn = consoleWarn;
        });

        it('should update children which are Intact components of Intact component', async () => {
            render(`<C><D v-if="show" /><D /></C>`, {
                C: ChildrenIntactComponent,
                D: SimpleIntactComponent,
            }, {show: false});

            vm.show = true;
            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div>Intact Component</div><div>Intact Component</div></div>');

            vm.show = false;
            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div>Intact Component</div></div>');
        });

        it('should update children which are Intact functional components of Intact component', async () => {
            const h = Intact.Vdt.miss.h;
            render(`<C><D v-if="show" /><D /></C>`, {
                C: ChildrenIntactComponent,
                D: Intact.functionalWrapper(props => {
                    return h(SimpleIntactComponent);
                }),
            }, {show: false});

            vm.show = true;
            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div>Intact Component</div><div>Intact Component</div></div>');

            vm.show = false;
            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div>Intact Component</div></div>');
        });

        it('should update children of Intact component which nested in vue element', async () => {
            render(`<div><C><div v-if="show">test</div></C></div>`, {
                C: ChildrenIntactComponent,
            }, {show: false});

            vm.show = true;
            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div><div>test</div></div></div>');

            vm.show = false;
            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div></div></div>');
        });

        it('should update children of slot in Intact component which nested in vue element', async () => {
            render(`<C><template v-slot:test>{{ show }}</template></C>`, {
                C: createIntactComponent(`<div><b:test /></div>`),
            }, {show: false});

            vm.show = true;
            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div>true</div>');
        });

        it('should handle ref correctly on update block in Intact component', async () => {
            render('<C ref="c"><template v-slot:content><D ref="d" v-if="show" /></template></C>', {
                C: createIntactComponent(`<div><b:content /></div>`),
                D: SimpleIntactComponent,
            }, {show: true});

            await nextTick();
            expect(vm.$refs.c.init).to.be.exist;
            expect(vm.$refs.d.init).to.be.exist;

            vm.$refs.c.update();
            expect(vm.$refs.c.init).to.be.exist;
            expect(vm.$refs.d.init).to.be.exist;

            vm.show = false;
            await nextTick();
            expect(vm.$refs.c.init).to.be.exist;
            expect(vm.$refs.d).to.be.null;
        });
    });

    describe('v-show', () => {
        it('should render v-show correctly', async () => {
            render(`<C v-show="show">
               <div v-show="show">show</div>
               <C v-show="show">test</C>
               <C v-show="show" style="font-size: 12px;">font-size</C>
               <C v-show="show" :style="{fontSize: '12px'}">fontSize</C>
            </C>`, {
                C: ChildrenIntactComponent
            }, {show: false});

            await nextTick();
            expect(vm.$el.outerHTML).eql('<div style="display: none;"><div style="display: none;">show</div><div style="display: none;">test</div><div style="font-size: 12px; display: none;">font-size</div><div style="font-size: 12px; display: none;">fontSize</div></div>');

            vm.show = true;
            await nextTick();
            expect(vm.$el.outerHTML).eql('<div><div style="">show</div><div>test</div><div style="font-size: 12px;">font-size</div><div style="font-size: 12px;">fontSize</div></div>');
        });
    });

    describe('Lifecycle', () => {
        it('lifecycle of intact in vue', async () => {
            const _create = sinon.spy();
            const _mount = sinon.spy();
            const _update = sinon.spy();
            const _destroy = sinon.spy();
            render('<C :a="a" v-if="show"/>', {
                C: createIntactComponent('<div>test</div>', {
                    _create,
                    _mount,
                    _update,
                    _destroy
                })
            }, {a: 1, show: true});

            vm.a = 2;
            await nextTick();
            expect(_create.callCount).be.eql(1);
            expect(_mount.callCount).be.eql(1);
            expect(_update.callCount).be.eql(1);

            vm.show = false;
            await nextTick();
            expect(_destroy.callCount).be.eql(1);
        });

        it('lifecycle of vue in intact', async () => {
            const created = sinon.spy();
            const mounted = sinon.spy();
            const updated = sinon.spy();
            const destroyed = sinon.spy();
            render('<C v-if="show"><VueComponent :a="a"/></C>', {
                C: ChildrenIntactComponent,
                VueComponent: {
                    props: ['a'],
                    template: '<div>{{a}}</div>',
                    created,
                    mounted,
                    updated,
                    unmounted: destroyed,
                }
            }, {show: true, a: 1});

            vm.a = 2;
            await nextTick();
            expect(created.callCount).be.eql(1);
            expect(mounted.callCount).be.eql(1);
            expect(updated.callCount).be.eql(1);

            vm.show = false;
            await nextTick();
            expect(destroyed.callCount).be.eql(1);
        });

        it('lifecycle of mounted nested intact component', async () => {
            const mounted1 = sinon.spy(() => {
                console.log(1)
            });
            const mounted2 = sinon.spy(() => {
                console.log(2)
            });
            const mounted3 = sinon.spy(() => {
                console.log(3);
            });
            const E = createIntactComponent(`<div></div>`, {_mount: mounted3});

            render('<div><C><div><D /></div></C></div>', {
                C: createIntactComponent('<div>{self.get("children")}</div>', {
                    _mount: mounted1,
                }),
                D: createIntactComponent('<div><E /></div>', {
                    _init() {
                        this.E = E;
                    },
                    _mount: mounted2
                })
            });

            await nextTick();
            expect(mounted1.callCount).be.eql(1);
            expect(mounted2.callCount).be.eql(1);
            expect(mounted2.calledBefore(mounted1)).be.true;
            expect(mounted3.calledBefore(mounted2)).be.true;
        });

        it('handle mountedQueue', async () => {
            render('<VueComponent :a="a" />', {
                VueComponent: {
                    props: ['a'],
                    template: '<div><C :a="a" />{{ a }}</div>',
                    components: {
                        C: createIntactComponent(
                            `<div>test</div>`,
                            {
                                _init() {
                                    this.on('$change:a', () => {
                                        this.update();
                                    })
                                }
                            }
                        ),
                    }
                }
            }, {a: 1});

            vm.a = 2;
            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div>test</div>2</div>');
        });

        it('call method of Intact component to show nested Intact component', async () => {
            function Test(isShow) {
                return new Promise(resolve => {
                    render('<div><IntactComponent ref="a"><div><C /></div></IntactComponent></div>', {
                        IntactComponent: createIntactComponent(
                            `<div v-if={self.get('show')}>{self.get('children')}</div>`,
                            {
                                defaults() {
                                    return {show: !!isShow};
                                },
                                show() {
                                    this.set('show', true);
                                }
                            }
                        ),
                        C: createIntactComponent(`<Test />`, {
                            _init() {
                                this.Test = createIntactComponent(`<div>test</div>`, {
                                    _mount() {
                                        expect(document.body.contains(this.element)).to.be.true;
                                        resolve();
                                    }
                                });
                            }
                        })
                    });
                });
            }

            await Test(true);
            await Promise.all([Test(false), vm.$refs.a.show()]);
        });

        it('should call mount method when we update data in vue mounted lifecycle method', async () => {
            class IntactComponent extends Intact {
                @Intact.template()
                static template = `<div>{self.get('value') ? self.get('children') : null}</div>`;
            };
            const mount = sinon.spy(() => console.log('mount'));
            class IntactChildrenComponent extends Intact {
                @Intact.template()
                static template = `<span>{self.get('children')}</span>`;

                _mount() {
                    mount();
                }
            };
            const Test = {
                template: `
                    <IntactChildrenComponent ref="b">
                        {{ value }}
                    </IntactChildrenComponent>
                `,
                components: {
                    IntactChildrenComponent,
                },
                data() {
                    return {value: 1}
                },
                mounted() {
                    this.value= 2;
                }
            };
            render(`<IntactComponent :value="show" ref="a"><Test ref="c" /></IntactComponent>`, {
                IntactComponent, Test,
            }, {show: false});

            vm.show = true;
            await nextTick();
            expect(mount.callCount).to.eql(1);
            expect(vm.$refs.a.mountedQueue.done).to.be.true;
            expect(vm.$refs.c.$refs.b.mountedQueue.done).to.be.true;
        });

        it('should call mounted after all components have mounted', async () => {
            const mount = sinon.spy(function() {
                expect(this.element.parentNode).to.be.exist;
            });
            const C = createIntactComponent(`<div>test</div>`, {
                _mount: mount,
            });
            render('<div><C /><C /></div>', {C});
            await nextTick();
            expect(mount.callCount).to.eql(2);
        });

        it('should call lifecycle correctly in the case that update in updating', async () => {
            const _beforeCreate = sinon.spy(() => console.log('beforeCreate'));
            const _mount = sinon.spy(() => console.log('mount'));
            const _beforeUpdate = sinon.spy(() => console.log('beforeUpdate'));
            const _update = sinon.spy(() => console.log('update'));
            render(`
                <C :data="data" v-model="value">
                    <template v-slot>
                        <div><D id="2">test</D></div>
                    </template>
                </C>
            `, {
                C: createIntactComponent(`
                    <div>
                        <div v-for={self.get('data')}>
                            <b:default />
                        </div>
                    </div>
                `, {
                    _init() {
                        this.on('$receive:value', (c, v) => {
                            if (v === 1) {
                                this.set('value', 2, {silent: true});
                            }
                        })
                    }
                }),
                D: createIntactComponent(`<div>{self.get('children')}</div>`, {
                    _beforeCreate,
                    _mount,
                    _beforeUpdate,
                    _update,
                }),
            }, {data: [], value: 0});

            vm.value = 1;
            vm.data = [1];

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div><div><div><div>test</div></div></div></div>');

            expect(_beforeCreate.callCount).to.eql(1);
            expect(_beforeUpdate.callCount).to.eql(1);
            expect(_mount.callCount).to.eql(1);
            expect(_update.callCount).to.eql(1);

            expect(_beforeCreate.calledBefore(_beforeUpdate)).to.be.true
            expect(_mount.calledBefore(_update)).to.be.true;
        });
    });

    describe('vNode', () => {
        it('change children\'s props of vue element', async () => {
            const onClick = sinon.spy(() => console.log('click'));
            class IntactComponent extends Intact {
                get template() {
                    return `<div>{self.get('children')}</div>`
                }

                _init() {
                    this._changeProps();
                    this.on('$change:children', this._changeProps);
                }

                _changeProps() {
                    const children = this.get('children');
                    children.props['ev-click'] = this.onClick.bind(this);
                    children.props.className = children.className + ' test';
                    children.props.style = {display: 'block'};
                }

                _remove() {
                    const children = this.get('children');
                    children.props.className = '';
                    children.props.style = {display: ''};
                }
            }
            IntactComponent.prototype.onClick = onClick;

            render('<C ref="c"><div class="a" :class="{b: true}" style="font-size: 12px;">click</div></C>', {
                C: IntactComponent,
            });

            await nextTick();
            dispatchEvent(vm.$el.firstChild, 'click');
            expect(vm.$el.innerHTML).eql('<div class="a b test" style="font-size: 12px; display: block;">click</div>');
            expect(onClick.callCount).be.eql(1);
            // vm.$forceUpdate();
            vm.$refs.c._remove();
            vm.$refs.c.update();
            await nextTick();
            dispatchEvent(vm.$el.firstChild, 'click');
            expect(onClick.callCount).be.eql(2);
            expect(vm.$el.innerHTML).eql('<div class="" style="font-size: 12px;">click</div>');
        });

        it('should get parentVNode of nested component', (done) => {
            render('<C><p><E><b><D /></b></E></p></C>', {
                C: ChildrenIntactComponent,
                D: createIntactComponent('<span>test</span>', {
                    _mount() {
                        expect(this.parentVNode.parentVNode.tag === ChildrenIntactComponent).to.be.true;
                        done();
                    }
                }),
                E: createIntactComponent('<i>{self.get("children")}</i>')
            });
        });

        it('should get parentVNode after updating', async () => {
            const C = createIntactComponent(`<div>{self.get('children')}</div>`);
            const mount = sinon.spy();
            const update = sinon.spy();

            class IntactComponent extends Intact {
                get template() {
                    return `<D>{self.get('children')}</D>`
                }

                _init() {
                    this.D = createIntactComponent('<i>{self.get("children")}</i>', {
                        _mount() {
                            mount();
                            expect(this.parentVNode.tag === IntactComponent).to.be.true;
                            expect(this.parentVNode.parentVNode.tag === C).to.be.true;
                            expect(this.parentVNode.parentVNode.parentVNode.tag === IntactComponent1).to.be.true;
                        },

                        _update() {
                            update();
                            expect(this.parentVNode.tag === IntactComponent).to.be.true;
                            expect(this.parentVNode.parentVNode.tag === C).to.be.true;
                            expect(this.parentVNode.parentVNode.parentVNode.tag === IntactComponent1).to.be.true;
                        }
                    });
                }
            }

            class IntactComponent1 extends Intact {
                get template() {
                    return `<C>{self.get('children')}</C>`;
                }

                _init() {
                    this.C = C;
                }
            }

            render(`<div>` +
                `{{count}}` +
                `<IntactComponent1>` +
                    `<p>` +
                        `{{count}}` +
                        `<IntactComponent>test{{count}}</IntactComponent>` +
                    `</p>` +
                `</IntactComponent1>` +
            `</div>`, {
                IntactComponent1,
                IntactComponent,
            }, {count: 1});

            vm.count = 2;
            await nextTick();
            expect(mount.callCount).to.eql(1);
            expect(update.callCount).to.eql(1);
        });

        it('should get parentVNode of inserted Component which nests in vue element in updating', (done) => {
            let count = 0;
            render('<C><div></div><div v-if="show"><D /><D /></div></C>', {
                C: ChildrenIntactComponent,
                D: createIntactComponent('<span>test</span>', {
                    _mount() {
                        count++;
                        expect(this.parentVNode.tag === ChildrenIntactComponent).to.be.true;
                        if (count === 2) {
                            done();
                        }
                    }
                }),
                E: SimpleIntactComponent,
            }, {show: false});
            vm.show = true;
        });
    });

    describe('v-model', () => {
        it('with modifier', async () => {
            render('<C v-model.trim="a" ref="a" />', {
                C: createIntactComponent(`<div>{self.get('value')}</div>`)
            }, {a: '1'}, {
                add() {
                    this.a = String(++this.a);
                }
            });

            window.vm = vm;
            vm.add();

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div>2</div>');

            vm.$refs.a.set('value', '3');
            expect(vm.a).to.eql('3');

            vm.$refs.a.set('value', '  4 ');
            expect(vm.a).to.eql('4');
        });

        it('with $change:value', async () =>{
            const change = sinon.spy();
            render('<C v-model="a" @$change:value="change" ref="a"/>', {
                C: createIntactComponent(`<div>{self.get('value')}</div>`)
            }, {a: 1}, {
                add() {
                    this.$refs.a.set('value', 2);
                },

                change
            });

            vm.add();
            await nextTick();
            expect(change.callCount).to.eql(1);
        });

        it('with propName', async () => {
            const test = sinon.spy(function() {console.log(arguments)});
            render('<C a="a" v-model:b="b" ref="test" @$change:b="(c, v) => test(1, c, v)"/>', {
                C: PropsIntactComponent
            }, {b: 1}, {test});

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div>a: a b: 1</div>');

            vm.$refs.test.set('b', 2);
            expect(vm.b).eql(2);
            expect(test.callCount).eql(1);
        });

        it('with hyphen-delimited propName', async () => {
            const Component = createIntactComponent(
                `<div>{self.get('userName')}</div>`,
            );
            Component.propTypes = {userName: String};
            const spy = sinon.spy();
            render('<C ref="test" v-model:user-name="name" @$change:user-name="onChange" />', {
                C: Component,
            }, {name: 'Javey'}, {onChange: spy});

            await nextTick();
            vm.$refs.test.set('userName', 'test');
            expect(vm.name).eql('test');
            expect(spy.callCount).eql(1);
        });
    });

    describe('Scoped style', () => {
        it('render scoped intact component', async () => {
            render('<Test1><C /><D><C /></D></Test1>', {
                C: SimpleIntactComponent,
                D: ChildrenIntactComponent,
                Test1
            });

            await nextTick();
            expect(vm.$el.outerHTML).to.eql('<div class="test1" data-v-68694da0=""><div class="test2" data-v-68694da0=""><span>test2</span><i data-v-68694da0="">test1</i><div data-v-68694da0="">intact component in vue<b data-v-68694da0="">test</b><div class="test3" data-v-6830ef9c="" data-v-68694da0=""><span data-v-6830ef9c="">test3</span><div data-v-68694da0="" data-v-6830ef9c-s="">intact component in vue<b data-v-68694da0="" data-v-6830ef9c-s="">test</b></div></div></div></div><div data-v-68694da0="">Intact Component</div><div data-v-68694da0=""><div data-v-68694da0="">Intact Component</div></div></div>');
        });
    });

    describe('Demo', () => {
        it('demo', () => {
            class IntactComponent extends Intact {
                get template() {
                    return `<button ev-click={self.onClick.bind(self)}>
                        click {self.get('value')}
                    </button>`;
                }

                onClick() {
                    this.set('value', this.get('value') + 1);
                    this.trigger('click');
                }
            }

            const container = document.createElement('div');
            document.body.appendChild(container);
            const vue = createApp({
                data() {
                    return {count: 0};
                },
                template: `<div>
                    <IntactComponent @click="onClick" v-model="count" ref="a"/>
                    <div>count: {{ count }}</div>
                </div>`,
                methods: {
                    onClick() {
                        console.log(this.count);
                    }
                },
                components: {IntactComponent}
            }).mount(container);
        });
    });

    describe('Vue Test', () => {
        it('render emtpy slot', async () => {
            render('<C><template v-slot:slot></template></C>', {
                C: {
                    template: `<div><slot name="slot">test</slot></div>`
                }
            });
        });

        it('keep-alive', async () => {
            render('<keep-alive><C /></keep-alive>', {
                C: function() {
                    const instance = getCurrentInstance();
                    const {p: patch} = instance.parent.ctx.renderer;
                    console.log(patch);
                    return h('div', null, 'test');
                }
            });
        });

        it('v-show', async () => {
            render('<C v-show="false">show</C>', {
                C: {
                    template: `<div><slot /></div>`
                }
            });
        });

        it('scoped', async () => {
            render('<Test3><div>test</div><Test /></Test3>', {
                Test3,
                Test: {
                    template: `<div>component</div>`
                }
            });
        });
    });
});
