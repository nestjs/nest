export interface INestExpressApplication {
    /**
     * A wrapper function around native `express.set()` method.
     * Example `app.set('trust proxy', 'loopback')`
     *
     * @returns void
     */
    set(...args: any[]): this;
    /**
     * A wrapper function around native `express.engine()` method.
     * Example `app.engine('mustache', mustacheExpress())`
     *
     * @returns void
     */
    engine(...args: any[]): this;
    /**
     * A wrapper function around native `express.enable()` method.
     * Example `app.enable('x-powered-by')`
     *
     * @returns void
     */
    enable(...args: any[]): this;
    /**
     * A wrapper function around native `express.disable()` method.
     * Example `app.disable('x-powered-by')`
     *
     * @returns void
     */
    disable(...args: any[]): this;
}
