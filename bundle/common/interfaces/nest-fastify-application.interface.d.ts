/// <reference types="node" />
export interface INestFastifyApplication {
    /**
     * A wrapper function around native `fastify.register()` method.
     * Example `app.register(require('fastify-formbody'))`
     *
     * @returns {this}
     */
    register(...args: any[]): this;
    /**
     * Sets a base directory for public assets.
     * Example `app.useStaticAssets({ root: 'public' })`
     *
     * @returns {this}
     */
    useStaticAssets(options: {
        root: string;
        prefix?: string;
        setHeaders?: Function;
        send?: any;
    }): this;
    /**
     * Sets a view engine for templates (views), for example: `pug`, `handlebars`, or `ejs`.
     *
     * @returns {this}
     */
    setViewEngine(options: any): this;
    /**
     * A wrapper function around native `fastify.inject()` method.
     * @returns {void}
     */
    inject(opts: HTTPInjectOptions | string): Promise<HTTPInjectResponse>;
}
/** Reference: https://github.com/fastify/fastify */
export declare type HTTPMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS';
/**
 * Fake http inject options
 */
export interface HTTPInjectOptions {
    url: string;
    method?: HTTPMethod;
    authority?: string;
    headers?: object;
    remoteAddress?: string;
    payload?: string | object | Buffer | any;
    simulate?: {
        end?: boolean;
        split?: boolean;
        error?: boolean;
        close?: boolean;
    };
    validate?: boolean;
}
/**
 * Fake http inject response
 */
export interface HTTPInjectResponse {
    raw: any;
    headers: object;
    statusCode: number;
    statusMessage: string;
    payload: string;
    rawPayload: Buffer;
    trailers: object;
}
