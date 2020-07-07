<template>
    <IntactComponent :test="test" :component="component" />
</template>
<script>
import Intact from '../src';

class IntactComponent extends Intact {
    get template() { return `<div>{self.get('test')}{self.get('component')}</div>`; }
}

export default {
    components: {
        IntactComponent,
    },
    data() {
        const h = this.$createElement;
        return {
            test: Intact.normalize(h('div', null, 'test')),
            component: Intact.normalize(h('IntactComponent'))
        }
    }
}
</script>
