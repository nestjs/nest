export interface INestFastifyApplication {
  /**
   * A wrapper function around native `fastify.register()` method.
   * Example `app.register(require('fastify-formbody'))`
   *
   * @returns this
   */
  register(...args): this;

  /**
   * Sets a base directory for public assets.
   * Example `app.useStaticAssets({ root: 'public' })`
   *
   * @returns this
   */
  useStaticAssets(options: {
    root: string,
    prefix: string,
    setHeaders: Function,
    send: any,
  }): this;

  /**
   * Sets a view engine for templates (views), for example: `pug`, `handlebars`, or `ejs`.
   *
   * @returns this
   */
  setViewEngine(options: any): this;
}