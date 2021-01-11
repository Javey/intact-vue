<template>
    <IntactComponent :test="test" :component="component" />
</template>
<script>
import Intact from '../src/IntactVue';
import {h} from 'vue';

class IntactComponent extends Intact {
    get template() { return `<div>{self.get('test')}{self.get('component')}</div>`; }
}

export default {
    components: {
        IntactComponent,
    },
    data() {
        return {
            test: Intact.normalize(h('div', null, 'test')),
            component: Intact.normalize(h(IntactComponent))
        }
    }
}
</script>
