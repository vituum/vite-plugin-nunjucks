import { dirname, resolve, relative } from 'path'
import fs from 'fs'
import process from 'node:process'
import FastGlob from 'fast-glob'
import lodash from 'lodash'
import nunjucks from 'nunjucks'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

const { name } = JSON.parse(fs.readFileSync(resolve(dirname((fileURLToPath(import.meta.url))), 'package.json')).toString())
const defaultOptions = {
    reload: true,
    root: null,
    filters: {},
    extensions: {},
    globals: {},
    data: '',
    filetypes: {
        html: /.(json.html|njk.json.html|njk.html)$/,
        json: /.(json.njk.html)$/
    },
    nunjucks: {}
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
    const context = options.data ? processData(options.data, options.globals) : options.globals

    const isJson = filename.endsWith('.json.html') || filename.endsWith('.json')
    const isHtml = filename.endsWith('.html') && !filename.endsWith('.json.html')

    if (isJson || isHtml) {
        lodash.merge(context, isHtml ? content : JSON.parse(fs.readFileSync(filename).toString()))

        output.template = true

        context.template = relative(process.cwd(), context.template).startsWith(relative(process.cwd(), options.root)) ? resolve(process.cwd(), context.template) : resolve(options.root, context.template)
    } else if (fs.existsSync(filename + '.json')) {
        lodash.merge(context, JSON.parse(fs.readFileSync(filename + '.json').toString()))
    }

    const nunjucksEnvironment = nunjucks.configure(options.root, Object.assign({
        noCache: true
    }, options.nunjucks));

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
        const callback = (error, content) => {
            if (error) {
                output.error = error
                resolve(output)
            } else {
                output.content = content
                resolve(output)
            }
        }

        if (output.template) {
            nunjucksEnvironment.render(context.template, context, callback)
        } else {
            nunjucksEnvironment.renderString(content, context, callback)
        }
    })
}

const plugin = (options = {}) => {
    options = lodash.merge(defaultOptions, options)

    return {
        name,
        config: ({ root }) => {
            if (!options.root) {
                options.root = root
            }
        },
        transformIndexHtml: {
            enforce: 'pre',
            async transform(content, { path, filename, server }) {
                path = path.replace('?raw', '')
                filename = filename.replace('?raw', '')

                if (
                    !options.filetypes.html.test(path) &&
                    !options.filetypes.json.test(path) &&
                    !content.startsWith('<script type="application/json" data-format="njk"')
                ) {
                    return content
                }

                if (content.startsWith('<script type="application/json" data-format="njk"')) {
                    const matches = content.matchAll(/<script\b[^>]*data-format="(?<format>[^>]+)"[^>]*>(?<data>[\s\S]+?)<\/script>/gmi)

                    for (const match of matches) {
                        content = JSON.parse(match.groups.data)
                    }
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
            if (
                (typeof options.reload === 'function' && options.reload(file)) ||
                (typeof options.reload === 'boolean' && options.reload && (options.filetypes.html.test(file) || options.filetypes.json.test(file)))
            ) {
                server.ws.send({ type: 'full-reload' })
            }
        }
    }
}

export default plugin
