/**
 * @publicApi
 */
export interface OnGatewayInit<T = any> {
  afterInit(server: T): any;
}
