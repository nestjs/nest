/**
 * @publicApi
 */
export interface OnGatewayInit<T = any> {
  /**
   * Called when the server is initialized for a singleton gateway. For a
   * connection-scoped gateway, called once on each constructed instance before
   * its connection or message handlers run.
   */
  afterInit(server: T): any;
}
