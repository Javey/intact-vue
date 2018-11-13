import Intact from '../src';
import Vue from 'vue';

let vm;

function render(template, components, data = {}, methods = {}) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return (vm = new Vue({
        el: container,
        data,
        methods,
        template,
        components,
    }));
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
    document.body.removeChild(vm.$el);
}

describe('Unit test', () => {
    // afterEach(reset);

    describe('Render', () => {
        it('render intact component in vue', (done) => {
            render('<C/>', {C: SimpleIntactComponent});
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(simpleTemplate);
                done();
            });
        });

        it('render intact in vue element', (done) => {
            render('<div><C/></div>', {C: SimpleIntactComponent});
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(`<div>${simpleTemplate}</div>`);
                done();
            });
        });

        it('render intact in vue component', (done) => {
            render(
                '<VueComponent><C/></VueComponent>',
                {
                    VueComponent: {
                        template: `<div><slot></slot></div>`
                    },
                    C: SimpleIntactComponent
                }
            );

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(`<div>${simpleTemplate}</div>`);
                done();
            });
        });
        
        it('render vue element in intact', done => {
            render('<C><div>vue</div></C>', {C: ChildrenIntactComponent});
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(`<div><div>vue</div></div>`);
                done();
            });
        });
        
        it('render vue component in intact', done => {
            render('<C><VueComponent /></C>', {
                C: ChildrenIntactComponent,
                VueComponent: {
                    template: `<div>vue component</div>`
                }
            });
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(`<div><div>vue component</div></div>`);
                done();
            });
        });

        it('render nested vue and intact', done => {
            render('<C><V><C><V></V></C></V></C>', {
                C: ChildrenIntactComponent,
                V: {
                    template: `<div><slot></slot></div>`
                }
            });
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(`<div><div><div><div></div></div></div></div>`);
                done();
            });
        });

        it('render nested component in template', done => {
            render('<C class="a"><V><div></div></V></C>', {
                C: ChildrenIntactComponent,
                V: {
                    template: `<C class="b"><slot></slot></C>`,
                    components: {
                        C: ChildrenIntactComponent,
                    }
                }
            });

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(`<div class="a"><div class="b"><div></div></div></div>`);
                done();
            });
        });

        it('render with props', done => {
            render('<C a="a" :b="b" />', {
                C: PropsIntactComponent
            }, {b: 1});
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql('<div>a: a b: 1</div>');
                done();
            });
        });

        it('render Boolean type prop', done => {
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
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql('<div>{"a":true,"b":true,"c":true,"d":true}</div>');

                done();
            });
        });

        it('render with v-model', done => {
            render('<C v-model.trim="a" ref="a" />', {
                C: createIntactComponent(`<div>{self.get('value')}</div>`)
            }, {a: 1}, {
                add() {
                    this.a++;
                }
            });

            window.vm = vm;
            vm.add();
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql('<div>2</div>');

                vm.$refs.a.set('value', 3);
                expect(vm.a).to.eql(3);

                vm.$refs.a.set('value', '  4 ');
                expect(vm.a).to.eql('4');

                done();
            });
        });

        it('render v-model with $change:value', done =>{
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
            vm.$nextTick(() => {
                expect(change.callCount).to.eql(1);
                done();
            })
        });

        it('render with event', done => {
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
            
            vm.$nextTick(() => {
                dispatchEvent(vm.$el.firstChild.firstChild, 'click');
                vm.$nextTick(() => {
                    expect(vm.$el.outerHTML).be.eql('<div><div>click</div>2</div>');
                    done();
                });
            });
        });

        it('render with slots', done => {
            render('<C><div slot="footer">footer</div><div>children</div></C>', {
                C: createIntactComponent(`<div>{self.get('children')}<b:footer></b:footer></div>`)
            });

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div><div>children</div><div>footer</div></div>');
                done();
            });
        });

        it('render undefined slot', done => {
            render('<C><div slot="footer"><C>test</C></div></C>', {
                C: createIntactComponent(`<div>{self.get('children')}</div>`)
            });

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div></div>');
                reset();

                render('<C><C><div slot="footer">test</div></C></C>', {
                    C: createIntactComponent(`<div>{self.get('children')}</div>`)
                });

                vm.$nextTick(() => {
                    expect(vm.$el.outerHTML).be.eql('<div><div></div></div>');
                    done();
                });
            });
        });

        it('render with scoped slots', done => {
            render('<C><div slot-scope="scope">{{ scope }}</div></C>', {
                // C: createIntactComponent(`<div>{self.get('default')('test')}</div>`)
                C: createIntactComponent(`<div><b:default args={['test']} /></div>`)
            });

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div><div>test</div></div>');
                done();
            });
        });

        it('ignore empty slot in vue, this is default behavior of vue', done => {
            render('<C><template slot="slot"></template></C>', {
                C: createIntactComponent(`<div><b:slot>test</b:slot></div>`)
            });

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div>test</div>');
                done();
            });
        });

        it('render functional component which wrap intact component', done => {
            const h = Intact.Vdt.miss.h;
            const Component = Intact.functionalWrapper(function(props) {
                return h(ChildrenIntactComponent, props);
            });
            render('<C class="a" :a="1">test</C>', {
                C: Component
            });

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div class="a">test</div>');
                done();
            });
        });

        it('render blocks in functional component', done => {
            const h = Intact.Vdt.miss.h;
            const Component = Intact.functionalWrapper(props => {
                return h(createIntactComponent(`<div><b:test /></div>`), props);
            });
            render('<C ref="test"><span slot="test">test</span></C>', {
                C: Component
            }, {test: 1});

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div><span>test</span></div>');
                const _context = vm.$refs.test.get('_context');
                expect(_context.data.get('test')).be.eql(1);
                _context.data.set('test', 2);
                expect(vm.test).be.eql(2);
                done();
            });
        });

        it('render style and class', done => {
            render(`<C style="color: red;" :style="{fontSize: '12px'}" class="a" :class="{b: true}"/>`, {
                C: createIntactComponent(`<div style={self.get('style')} class={self.get('className')}>test</div>`)
            });

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div class="a b" style="color: red; font-size: 12px;">test</div>');
                done();
            });
        });

        it('render async intact component', done => {
            render('<C />', {
                C: createIntactComponent('<div>test</div>', {
                    _init() {
                        return new Promise((resolve) => {
                            resolve();
                        });
                    }
                })
            });

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div>test</div>');
                done();
            });
        });
    });

    describe('Update', () => {
        it('insert removed element should keep the original order', (done) => {
            render('<div><C v-if="show">1</C><C>2</C></div>', {
                C: ChildrenIntactComponent
            }, {show: false});

            vm.show = true;

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div><div>1</div><div>2</div></div>');
                done();
            });
        });

        it('insert keyed child before non-keyed child', (done) => {
            render('<div><div v-if="show"><C>1</C></div><div v-else><C key="1">2</C><D /></div></div>', {
                C: ChildrenIntactComponent,
                D: SimpleIntactComponent
            }, {show: true});

            vm.show = false;

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div><div><div>2</div><div>Intact Component</div></div></div>');
                done();
            });
        });

        it('update keyed functional component children', (done) => {
            const h = Intact.Vdt.miss.h;
            render('<C><div><div v-if="show"><C key="a" ref="a">1</C></div><div v-else><C key="b" ref="b">2</C></div></div></C>', {
                C: Intact.functionalWrapper(function Wrapper(props) {
                    return h(ChildrenIntactComponent, props);
                }),
            }, {show: true});

            vm.$nextTick(() => {
                const a = vm.$refs.a;
                vm.show = false;
                vm.$nextTick(() => {
                    const b = vm.$refs.b;
                    expect(a === b).be.false;
                    expect(vm.$el.innerHTML).be.eql('<div><div><div>2</div></div></div>');
                    done();
                });
            });
        });

        it('diff IntactComponent with vue element', function(done) {
            this.enableTimeouts(false);
            render('<C><C v-if="show">1</C><p v-else>2</p></C>', {
                C: ChildrenIntactComponent
            }, {show: false});

            vm.show = true;

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div><div>1</div></div>');

                vm.show = false;

                vm.$nextTick(() => {
                    expect(vm.$el.outerHTML).be.eql('<div><p>2</p></div>');
                    done();
                });
            });
        });

        it('should update ref', done => {
            render('<div><C v-if="show">1</C><C ref="a" v-else>2</C></div>', {
                // C: Vue.extend({
                    // template: '<div><template slots="default"></template></div>'
                // }) 
                C: ChildrenIntactComponent
            }, {show: true});

            vm.show = false;
            vm.$nextTick(() => {
                expect(vm.$refs.a).be.an.instanceof(ChildrenIntactComponent);
                done();
            });
        });

        it('should watch vue component nested into intact component', () => {
            render('<C><D :a="a" /><div @click="add">click</div></C>', {
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
                            handler() {
                                console.log('test');
                            }
                        }
                    }
                }
            }, {a: [2]}, {add() { this.a.push(2) }});
        });

        it('should update correctly even if intact has changed type of element', (done) => {
            render(`<div><div v-if="show"><C :total="total" /></div><div v-else></div></div>`, {
                C: createIntactComponent(`if (!self.get('total')) return; <div>component</div>`)
            }, {show: true, total: 0});

            vm.total = 1;
            vm.$nextTick(() => {
                vm.show = false;
                vm.$nextTick(() => {
                    expect(vm.$el.outerHTML).eql('<div><div></div></div>');

                    done();
                });
            });
        });
    });

    describe('v-show', () => {
        it('should render v-show correctly', (done) => {
            render(`<C>
               <div v-show="show">show</div>
               <C v-show="show">test</C>
               <C v-show="show" style="font-size: 12px;">font-size</C>
               <C v-show="show" :style="{fontSize: '12px'}">fontSize</C>
            </C>`, {
                C: ChildrenIntactComponent
            }, {show: false});

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).eql('<div><div style="display: none;">show</div> <div style="display: none;">test</div> <div style="font-size: 12px; display: none;">font-size</div> <div style="font-size: 12px; display: none;">fontSize</div></div>');

                vm.show = true;
                vm.$nextTick(() => {
                    expect(vm.$el.outerHTML).eql('<div><div style="">show</div> <div>test</div> <div style="font-size: 12px;">font-size</div> <div style="font-size: 12px;">fontSize</div></div>');

                    done();
                });
            });
        });
    });

    describe('Lifecycle', () => {
        it('lifecycle of intact in vue', (done) => {
            const _create = sinon.spy();
            const _mount = sinon.spy();
            const _update = sinon.spy();
            const _destroy = sinon.spy();
            render('<C :a="a" v-if="show"/>', {
                C: createIntactComponent('<div></div>', {
                    _create,
                    _mount,
                    _update, 
                    _destroy
                })
            }, {a: 1, show: true});

            vm.a = 2;
            vm.$nextTick(() => {
                expect(_create.callCount).be.eql(1);
                expect(_mount.callCount).be.eql(1);
                expect(_update.callCount).be.eql(1);

                vm.show = false;
                vm.$nextTick(() => {
                    expect(_destroy.callCount).be.eql(1);
                    done();
                });
            });
        });

        it('lifecycle of vue in intact', done => {
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
                    destroyed
                }
            }, {show: true, a: 1});

            vm.a = 2;
            vm.$nextTick(() => {
                expect(created.callCount).be.eql(1);
                expect(mounted.callCount).be.eql(1);
                expect(updated.callCount).be.eql(1);

                vm.show = false;
                vm.$nextTick(() => {
                    expect(destroyed.callCount).be.eql(1);
                    done();
                });
            });
        });

        it('lifecycle of mounted nested intact component', done => {
            const mounted1 = sinon.spy(() => console.log(1));
            const mounted2 = sinon.spy(() => console.log(2));

            render('<div<C><div><D /></div></C></div>', {
                C: createIntactComponent('<div>{self.get("children")}</div>', {
                    _mount: mounted1,
                }),
                D: createIntactComponent('<div></div>', {
                    _mount: mounted2
                })
            });

            vm.$nextTick(() => {
                expect(mounted1.callCount).be.eql(1);
                expect(mounted2.callCount).be.eql(1);
                expect(mounted2.calledAfter(mounted1)).be.true;
                done();
            });
        });

        it('handle mountedQueue', done => {
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
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql('<div><div>test</div>2</div>');
                done();
            });
      
        })
    });

    describe('vNode', () => {
        it('change children\'s props of vue element', function(done) {
            this.enableTimeouts(false);
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
                    const children = this.get('children.0');
                    children.props['ev-click'] = this.onClick.bind(this);
                }
            }
            IntactComponent.prototype.onClick = onClick;

            render('<C><div>click</div></C>', {
                C: IntactComponent,
            });

            vm.$nextTick(() => {
                dispatchEvent(vm.$el.firstChild, 'click');
                expect(onClick.callCount).be.eql(1);
                vm.$forceUpdate();
                vm.$nextTick(() => {
                    dispatchEvent(vm.$el.firstChild, 'click');
                    expect(onClick.callCount).be.eql(2);
                    done();
                });
            });
        });

        it('should get parentVNode', function(done) {
            this.enableTimeouts(false);
            // render('<C><p><E><b><D /></b></E></p></C>', {
                // C: {template: `<div><slot></slot></div>`},
                // D: {template: `<span>test</span>`},
                // E: {template: `<i><slot></slot></i>`},
            // });

            // render('<C><D /></C>', {
                // C: ChildrenIntactComponent,
                // D: createIntactComponent('<span>test</span>', {
                    // _mount() {
                        // console.log(this);
                    // }
                // })
            // });

            render('<C><p><E><b><D /></b></E></p></C>', {
                C: ChildrenIntactComponent,
                D: createIntactComponent('<span>test</span>', {
                    _mount() {
                        expect(this.parentVNode.parentVNode.tag === ChildrenIntactComponent).to.be.true;
                    }
                }),
                E: createIntactComponent('<i>{self.get("children")}</i>')
            });

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

            render('<div>{{count}}<IntactComponent1><p>{{count}}<IntactComponent>test{{count}}</IntactComponent></p></IntactComponent1></div>', {
                IntactComponent1,
                IntactComponent,
            }, {count: 1});

            vm.count = 2;
            vm.$nextTick(() => {
                expect(mount.callCount).to.eql(1);
                expect(update.callCount).to.eql(1);
                done();
            });
        });

        it('should get context data', (done) => {
            render('<div><IntactComponent ref="test" /></div>', {
                IntactComponent: ChildrenIntactComponent,
            }, {test: 1});

            vm.$nextTick(() => {
                const _context = vm.$refs.test.get('_context');
                expect(_context).to.be.a('object');
                expect(_context.data.get('test')).to.eql(1);
                _context.data.set('test', 2);
                expect(vm.test).to.eql(2);
                done();
            });
        });
    });

    describe('Modifier', () => {
        it('sync', (done) => {
            const test = sinon.spy(function() {console.log(arguments)});
            render('<C a="a" :b.sync="b" ref="test" @$change:b="test(1, ...arguments)"/>', {
                C: PropsIntactComponent
            }, {b: 1}, {test});

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql('<div>a: a b: 1</div>');
                
                vm.$refs.test.set('b', 2);
                expect(vm.b).eql(2);
                expect(test.callCount).eql(1);
                done();
            });
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
            const vue = new Vue({
                el: container,
                data: {
                    count: 0,
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
            });
        });
    });
});
