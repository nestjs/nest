export interface INestFastifyApplication {
  /**
   * A wrapper function around native `fastify.register()` method.
   * Example `app.register(require('fastify-formbody'))`
   *
   * @returns void
   */
  register(...args): this;
}
