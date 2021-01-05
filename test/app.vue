<template>
    <Component :onVnodeMounted="test">
        <div>hello world!</div>
    </Component>
</template>
<script>
import Component from './component.vue';

export default {
    name: 'App',

    components: {
        Component
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
