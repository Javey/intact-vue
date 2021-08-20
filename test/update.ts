import {Component} from '../src';
import {
    dispatchEvent,
    createIntactComponent,
    SimpleIntactComponent,
    ChildrenIntactComponent,
    PropsIntactComponent,
    vm,
    render,
    reset,
    nextTick,
} from './helpers';
import {createVNode as h, ComponentFunction} from 'intact';
import {h as v, ComponentPublicInstance} from 'vue';
import Normalize from './normalize.vue';

describe('Unit Test', () => {
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
            class IntactComponent extends Component {
                static template = `const C = this.C; <div>{this.get('children')}<C ref="c" /></div>`;
                private C!: typeof SimpleIntactComponent;
                init() {
                    this.C = SimpleIntactComponent;
                } 
            }
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
            render(`
                <C>
                    <div>
                        <C :forwardRef="i => a = i" v-if="show">1</C>
                        <C :forwardRef="i => b = i" v-else>2</C>
                    </div>
                </C>
                `, {
                C: Component.functionalWrapper(function Wrapper(props: any) {
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
            render(function(this: ComponentPublicInstance<{show: boolean}>) {
                return v(C, null, this.show ? v(C, null, '1') : v('p', null, '2'));
            }, undefined, function() {
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
            render(function(this: ComponentPublicInstance<{show: boolean}>) {
                return v('div', null, this.show ? v(C, null, 1) : v(C, {ref: 'a'}, 2));
            }, undefined, {show: true});

            vm.show = false;
            await nextTick();
            expect(vm.$refs.a.forceUpdate).to.exist;
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
            }, {data: []}, {add(this: any, index: number) {
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
    });
});
