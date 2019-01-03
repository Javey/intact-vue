<template>
    <div class="test1">
        <Test2>
            <i>test1</i>
            <IntactComponent>
                <b>test</b>
                <Test3>
                    <IntactComponent>
                        <b>test</b>
                    </IntactComponent>
                </Test3>
            </IntactComponent>
        </Test2>
    </div>
</template>
<style scoped></style>
<script>
import Intact from '../src';
import Test2 from './test2.vue';
import Test3 from './test3.vue';
class IntactComponent extends Intact {
    get template() { return `<div>intact component in vue{self.get('children')}</div>`; }
}

export default {
    components: {
        IntactComponent, Test2, Test3,
    }
}
</script>
