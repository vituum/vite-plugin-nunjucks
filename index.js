import { dirname, extname, resolve, relative } from 'path'
import fs from 'fs'
import process from 'node:process'
import FastGlob from 'fast-glob'
import lodash from 'lodash'
import nunjucks from 'nunjucks'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

const { name } = JSON.parse(fs.readFileSync(resolve(dirname((fileURLToPath(import.meta.url))), 'package.json')).toString())
const defaultOptions = {
    filters: {},
    extensions: {},
    globals: {},
    data: '',
    filetypes: {
        html: /.(json.html|njk.json.html|njk.html)$/,
        json: /.(json.njk.html)$/
    },
    options: {}
}

function processData(paths, data = {}) {
    let context = {}

    lodash.merge(context, data)

    FastGlob.sync(paths).forEach(entry => {
        const path = resolve(process.cwd(), entry)

        context = lodash.merge(context, JSON.parse(fs.readFileSync(path).toString()))
    })

    return context
}

const renderTemplate = async(filename, content, options) => {
    const output = {}
    const context = processData(options.data, options.globals)
    let isTemplate = false

    if (
        filename.endsWith('.json.html') ||
        filename.endsWith('.json')
    ) {
        lodash.merge(context, JSON.parse(fs.readFileSync(filename).toString()))

        isTemplate = true

        context.template = relative(process.cwd(), context.template)
    } else if (fs.existsSync(filename + '.json')) {
        lodash.merge(context, JSON.parse(fs.readFileSync(filename + '.json').toString()))
    }

    const nunjucksEnvironment = nunjucks.configure(options.root, Object.assign({
        noCache: true
    }, options.options));

    Object.keys(options.filters).forEach(name => {
        if (typeof options.filters[name] !== 'function') {
            throw new TypeError(`${name} needs to be a function!`)
        }

        nunjucksEnvironment.addFilter(name, options.filters[name])
    })

    Object.keys(options.extensions).forEach(name => {
        if (typeof options.extensions[name] !== 'function') {
            throw new TypeError(`${name} needs to be an function!`)
        }

        nunjucksEnvironment.addExtension(name, new options.extensions[name]());
    })

    return new Promise((resolve) => {
        if (isTemplate) {
            nunjucksEnvironment.render(context.template, context, (error, content) => {
                if (error) {
                    output.error = error
                    resolve(output)
                } else {
                    output.content = content
                    resolve(output)
                }
            })
        } else {
            nunjucksEnvironment.renderString(content, context, (error, content) => {
                if (error) {
                    output.error = error
                    resolve(output)
                } else {
                    output.content = content
                    resolve(output)
                }
            })
        }
    })
}

const plugin = (options = {}) => {
    options = lodash.merge(defaultOptions, options)

    return {
        name,
        config: ({ root }) => {
            options.root = root
        },
        transformIndexHtml: {
            enforce: 'pre',
            async transform(content, { path, filename, server }) {
                if (
                    !options.filetypes.html.test(path) &&
                    !options.filetypes.json.test(path) &&
                    !content.startsWith('<script type="application/json"')
                ) {
                    return content
                }

                if (content.startsWith('<script type="application/json"') && !content.includes('data-format="njk"')) {
                    return content
                }

                const render = await renderTemplate(filename, content, options)

                if (render.error) {
                    if (!server) {
                        console.error(chalk.red(render.error))
                        return
                    }

                    server.ws.send({
                        type: 'error',
                        err: {
                            message: render.error.message,
                            plugin: name
                        }
                    })
                }

                return render.content
            }
        },
        handleHotUpdate({ file, server }) {
            if (extname(file) === '.njk' || extname(file) === '.html' || extname(file) === '.json') {
                server.ws.send({ type: 'full-reload' })
            }
        }
    }
}

export default plugin
