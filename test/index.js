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
const ChildrenIntactComponent = createIntactComponent(`<div>{self.get('children')}</div>`);
const PropsIntactComponent = createIntactComponent(`<div>a: {self.get('a')} b: {self.get('b')}</div>`);

describe('Unit test', () => {
    afterEach(() => {
        document.body.removeChild(vm.$el);
    });

    describe('Render', () => {
        it('render intact component in vue', (done) => {
            render('<Component />', {Component: SimpleIntactComponent});
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(simpleTemplate);
                done();
            });
        });

        it('render intact in vue element', (done) => {
            render('<div><Component /></div>', {Component: SimpleIntactComponent});
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(`<div>${simpleTemplate}</div>`);
                done();
            });
        });

        it('render intact in vue component', (done) => {
            render(
                '<VueComponent><Component /></VueComponent>',
                {
                    VueComponent: {
                        template: `<div><slot></slot></div>`
                    },
                    Component: SimpleIntactComponent
                }
            );

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(`<div>${simpleTemplate}</div>`);
                done();
            });
        });
        
        it('render vue element in intact', done => {
            render('<Component><div>vue</div></Component>', {Component: ChildrenIntactComponent});
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql(`<div><div>vue</div></div>`);
                done();
            });
        });
        
        it('render vue component in intact', done => {
            render('<Component><VueComponent /></Component>', {
                Component: ChildrenIntactComponent,
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

        it('render with props', done => {
            render('<Component a="a" :b="b" />', {
                Component: PropsIntactComponent
            }, {b: 1});
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql('<div>a: a b: 1</div>');
                done();
            });
        });

        it('render with v-model', done => {
            render('<Component v-model="a" ref="a" />', {
                Component: createIntactComponent(`<div>{self.get('value')}</div>`)
            }, {a: 1}, {
                add() {
                    this.a++;
                }
            });

            vm.add();
            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).to.eql('<div>2</div>');

                vm.$refs.a.set('value', 3);
                expect(vm.a).to.eql(3);

                done();
            });
        });

        it('render with event', done => {
            render('<div><Component @click="onClick" />{{ a }}</div>', {
                Component: createIntactComponent(`<div ev-click={self.onClick.bind(self)}>click</div>`, {
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
            render('<Component><div slot="footer">footer</div><div>children</div></Component>', {
                Component: createIntactComponent(`<div>{self.get('children')}<b:footer></b:footer></div>`)
            });

            vm.$nextTick(() => {
                expect(vm.$el.outerHTML).be.eql('<div><div>children</div><div>footer</div></div>');
                done();
            });
        });
    });

    describe('Lifecycle', () => {
        it('lifecycle of intact in vue', (done) => {
            const _create = sinon.spy();
            const _mount = sinon.spy();
            const _update = sinon.spy();
            const _destroy = sinon.spy();
            render('<Component :a="a" v-if="show"/>', {
                Component: createIntactComponent('<div></div>', {
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
            render('<Component v-if="show"><VueComponent :a="a"/></Component>', {
                Component: ChildrenIntactComponent,
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
    });

    describe('Demo', () => {
        class IntactComponent extends Intact {
            get template() {
                return `<button ev-click={self.onClick.bind(self)}>
                    click {self.get('value')}
                </button>`;
            }

            onClick() {
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
                <IntactComponent @click="add" v-model="count"/>
                <div>count: {{ count }}</div>
            </div>`,
            methods: {
                add() {
                    this.count++;
                }
            },
            components: {IntactComponent}
        });
    });
});
