# intact-vue

A compatibiliy layer for running Intact[1] component in Vue[2].

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
```

[1]: http://javey.github.io/intact
[2]: https://vuejs.org
