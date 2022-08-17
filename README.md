<a href="https://npmjs.com/package/@vituum/vite-plugin-nunjucks"><img src="https://img.shields.io/npm/v/@vituum/vite-plugin-nunjucks.svg" alt="npm package"></a>
<a href="https://nodejs.org/en/about/releases/"><img src="https://img.shields.io/node/v/@vituum/vite-plugin-nunjucks.svg" alt="node compatility"></a>

# ⚡💡️ ViteNunjucks

```js
import nunjucks from '@vituum/vite-plugin-nunjucks'

export default {
  plugins: [
    nunjucks({
      filters: {}, 
      extensions: {},
      data: '*.json',
      globals: {
          template: 'path/to/template.njk'
      },
      filetypes: {
          html: /.(json.html|njk.json.html|njk.html)$/,
          json: /.(json.njk.html)$/
      },
      options: {} // liquidjs options
    })
  ]
}
```

```html
<!-- index.html -->
<script type="application/json" data-format="liquid">
  {
    "template": "path/to/template.njk",
    "title": "Hello world"
  }
</script>
```
or
```html
<!-- index.njk.html with index.njk.json -->
{{ title }}
```
or
```html
<!-- index.json.html or index.njk.json.html  -->
{
  "template": "path/to/template.njk",
  "title": "Hello world"
}
```

### Requirements

- [Node.js LTS (16.x)](https://nodejs.org/en/download/)
