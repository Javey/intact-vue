<template>
    <div>hello world!</div>
    <slot />
</template>
<script>
export default {
    name: 'Component',

    created() {
        console.log('created component')
    },

    methods: {
        hello() {
            console.log('component');
        }
    }
}
</script>
