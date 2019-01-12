# intact-vue

A compatibility layer for running [Intact][1] component in [Vue][2].

## Usage

```js
import Vue from 'vue';
import Intact from 'intact-vue';

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
        <IntactComponent @click="onClick" v-model="count"/>
        <div>count: {{ count }}</div>
    </div>`,
    methods: {
        onClick() {
            console.log(this.count);
        }
    },
    components: {IntactComponent}
});
```

### webpack

You can use alias config of webpack to replace intact module.

```js
resolve: {
    alias: {
        'intact$': 'intact-vue'
    }
}
```

## Incompatible

1. `.native` modifier is not supported. For example:

    ```js
    // native modifier
    <IntactComponent @click.native="onClick" />
    ```

2. ~~Intact does not support `scoped`. You should avoid using them. ~~
~~Use className to limit style instead of.~~

3. [Multiple values][3] style is not supported.

[1]: http://javey.github.io/intact
[2]: https://vuejs.org
[3]: https://vuejs.org/v2/guide/class-and-style.html#Multiple-Values
