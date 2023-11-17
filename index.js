import { resolve, relative } from 'path'
import fs from 'fs'
import lodash from 'lodash'
import nunjucks from 'nunjucks'
import {
    getPackageInfo,
    merge,
    pluginBundle,
    pluginMiddleware,
    pluginReload,
    pluginTransform,
    processData
} from 'vituum/utils/common.js'
import { renameBuildEnd, renameBuildStart } from 'vituum/utils/build.js'

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

const renderTemplate = async ({ filename, server, resolvedConfig }, content, options) => {
    const initialFilename = filename.replace('.html', '')
    const output = {}
    const context = options.data
        ? processData({
            paths: options.data,
            root: resolvedConfig.root
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

        context.template = relative(resolvedConfig.root, context.template).startsWith(relative(resolvedConfig.root, options.root)) ? resolve(resolvedConfig.root, context.template) : resolve(options.root, context.template)
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
            if (userEnv.command !== 'build' || !resolvedConfig.build.rollupOptions.input) {
                return
            }

            await renameBuildStart(resolvedConfig.build.rollupOptions.input, options.formats)
        },
        buildEnd: async () => {
            if (userEnv.command !== 'build' || !resolvedConfig.build.rollupOptions.input) {
                return
            }

            await renameBuildEnd(resolvedConfig.build.rollupOptions.input, options.formats)
        },
        transformIndexHtml: {
            order: 'pre',
            async handler (content, { path, filename, server }) {
                return pluginTransform(content, { path, filename, server }, { name, options, resolvedConfig, renderTemplate })
            }
        },
        handleHotUpdate: ({ file, server }) => pluginReload({ file, server }, options)
    }, pluginBundle(options.formats), pluginMiddleware(name, options.formats)]
}

export default plugin
