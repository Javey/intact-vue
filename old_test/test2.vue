<template>
    <div class="test2">
        <span>test2</span>
        <slot />
    </div>
</template>
<style></style>
<script>
import Intact from '../src';
class IntactComponent extends Intact {
    get template() { return '<div>intact component in vue</div>'; }
}

export default {
    components: {
        IntactComponent,
    }
}
</script>
