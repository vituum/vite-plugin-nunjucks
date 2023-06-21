import { resolve, relative } from 'path'
import fs from 'fs'
import process from 'node:process'
import lodash from 'lodash'
import nunjucks from 'nunjucks'
import { getPackageInfo, merge, pluginBundle, pluginError, pluginReload, processData } from 'vituum/utils/common.js'
import { renameBuildEnd, renameBuildStart } from 'vituum/utils/build.js'
import { minimatch } from 'minimatch'

const { name } = getPackageInfo(import.meta.url)

/**
 * @type {import('@vituum/vite-plugin-nunjucks/types').PluginUserConfig}
 */
const defaultOptions = {
    reload: true,
    root: null,
    filters: {},
    extensions: {},
    globals: {
        format: 'njk'
    },
    data: ['src/data/**/*.json'],
    formats: ['njk', 'json.njk', 'json'],
    ignoredPaths: [],
    options: {}
}

const renderTemplate = async ({ filename, server, root }, content, options) => {
    const initialFilename = filename.replace('.html', '')
    const output = {}
    const context = options.data
        ? processData({
            paths: options.data,
            root
        }, options.globals)
        : options.globals

    if (initialFilename.endsWith('.json')) {
        lodash.merge(context, JSON.parse(content))

        if (!options.formats.includes(context.format)) {
            return new Promise((resolve) => {
                output.content = content
                resolve(output)
            })
        }

        output.template = true

        if (typeof context.template === 'undefined') {
            const error = `${name}: template must be defined for file ${initialFilename}`

            return new Promise((resolve) => {
                output.error = error
                resolve(output)
            })
        }

        context.template = relative(process.cwd(), context.template).startsWith(relative(process.cwd(), options.root)) ? resolve(process.cwd(), context.template) : resolve(options.root, context.template)
    } else if (fs.existsSync(`${initialFilename}.json`)) {
        lodash.merge(context, JSON.parse(fs.readFileSync(`${initialFilename}.json`).toString()))
    }

    const nunjucksEnvironment = nunjucks.configure(options.root, Object.assign({
        noCache: true
    }, options.options))

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

        nunjucksEnvironment.addExtension(name, new options.extensions[name]())
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

/**
 * @param {import('@vituum/vite-plugin-nunjucks/types').PluginUserConfig} options
 * @returns [import('vite').Plugin]
 */
const plugin = (options = {}) => {
    let resolvedConfig
    let userEnv

    options = merge(defaultOptions, options)

    return [{
        name,
        config (userConfig, env) {
            userEnv = env
        },
        configResolved (config) {
            resolvedConfig = config

            if (!options.root) {
                options.root = config.root
            }
        },
        buildStart: async () => {
            if (userEnv.command !== 'build') {
                return
            }

            await renameBuildStart(resolvedConfig.build.rollupOptions.input, options.formats)
        },
        buildEnd: async () => {
            if (userEnv.command !== 'build') {
                return
            }

            await renameBuildEnd(resolvedConfig.build.rollupOptions.input, options.formats)
        },
        transformIndexHtml: {
            order: 'pre',
            async transform (content, { path, filename, server }) {
                if (
                    !options.formats.find(format => filename.replace('.html', '').endsWith(format)) ||
                    (filename.replace('.html', '').endsWith('.json') && !content.startsWith('{'))
                ) {
                    return content
                }

                if (
                    (filename.replace('.html', '').endsWith('.json') && content.startsWith('{')) &&
                    (JSON.parse(content)?.format && !options.formats.includes(JSON.parse(content)?.format))
                ) {
                    return content
                }

                if (options.ignoredPaths.find(ignoredPath => minimatch(path.replace('.html', ''), ignoredPath) === true)) {
                    return content
                }

                const render = await renderTemplate({ filename, server, root: resolvedConfig.root }, content, options)
                const renderError = pluginError(render.error, server, name)

                if (renderError && server) {
                    return
                } else if (renderError) {
                    return renderError
                }

                return render.content
            }
        },
        handleHotUpdate: ({ file, server }) => pluginReload({ file, server }, options)
    }, pluginBundle(options.formats)]
}

export default plugin
