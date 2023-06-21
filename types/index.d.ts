interface NunjucksOptions {
    autoescape?: boolean | undefined;
    throwOnUndefined?: boolean | undefined;
    trimBlocks?: boolean | undefined;
    lstripBlocks?: boolean | undefined;
    watch?: boolean | undefined;
    noCache?: boolean | undefined;
    dev?: boolean | undefined;
    web?:
        | {
        useCache?: boolean | undefined;
        async?: boolean | undefined;
    }
        | undefined;
    express?: object | undefined;
    tags?:
        | {
        blockStart?: string | undefined;
        blockEnd?: string | undefined;
        variableStart?: string | undefined;
        variableEnd?: string | undefined;
        commentStart?: string | undefined;
        commentEnd?: string | undefined;
    }
        | undefined;
}

export interface PluginUserConfig {
    reload?: boolean | Function
    root?: string
    filters?: Object
    extensions?: Object
    globals?: Object
    data?: string | string[]
    formats?: string[]
    ignoredPaths?: string[]
    options?: NunjucksOptions
}
