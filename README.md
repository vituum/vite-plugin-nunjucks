<a href="https://npmjs.com/package/@vituum/vite-plugin-nunjucks"><img src="https://img.shields.io/npm/v/@vituum/vite-plugin-nunjucks.svg" alt="npm package"></a>
<a href="https://nodejs.org/en/about/releases/"><img src="https://img.shields.io/node/v/@vituum/vite-plugin-nunjucks.svg" alt="node compatility"></a>

# ⚡💡️ ViteNunjucks

```js
import nunjucks from '@vituum/vite-plugin-nunjucks'

export default {
    plugins: [
        nunjucks()
    ],
    build: {
        rollupOptions: {
            input: ['index.njk.html']
        }
    }

}
```

* Read the [docs](https://vituum.dev/plugins/nunjucks.html) to learn more about the plugin options.
* Use with [Vituum](https://vituum.dev) to get multi-page support.

## Basic usage

or
```html
<!-- index.njk with index.njk.json -->
{{ title }}
```
or
```html
<!-- index.json  -->
{
  "template": "path/to/template.njk",
  "title": "Hello world"
}
```

### Requirements

- [Node.js LTS (18.x)](https://nodejs.org/en/download/)
- [Vite](https://vitejs.dev/)
