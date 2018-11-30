export interface OnGatewayDisconnect<T = any> {
  handleDisconnect(client: T): any;
}
