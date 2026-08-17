/**
 * @publicApi
 */
export interface OnGatewayDisconnect<T = any> {
  handleDisconnect(client: T, reason?: string): any;
}
