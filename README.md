<a href="https://npmjs.com/package/@vituum/vite-plugin-nunjucks"><img src="https://img.shields.io/npm/v/@vituum/vite-plugin-nunjucks.svg" alt="npm package"></a>
<a href="https://nodejs.org/en/about/releases/"><img src="https://img.shields.io/node/v/@vituum/vite-plugin-nunjucks.svg" alt="node compatility"></a>

# ⚡💡️ ViteNunjucks

```js
import nunjucks from '@vituum/vite-plugin-nunjucks'

export default {
  plugins: [
    nunjucks()
  ]
}
```

Read the [docs](https://vituum.dev/plugins/nunjucks) to learn more about the plugin options.

## Basic usage

or
```html
<!-- index.njk with index.njk.json -->
{{ title }}
```
or
```html
<!-- index.json or index.njk.json  -->
{
  "template": "path/to/template.njk",
  "title": "Hello world"
}
```

### Requirements

- [Node.js LTS (18.x)](https://nodejs.org/en/download/)
- [Vite](https://vitejs.dev/)
