<template>
    <C :onVnodeMounted="test">
        <div>hello world!</div>
    </C>
</template>
<script>
import C from './component.vue';

export default {
    name: 'App',

    components: {
        C
    },

    created() {
        console.log('created')
    },

    methods: {
        test() {
            console.log('test');
        }
    }
}
</script>
