export interface OnGatewayConnection<T = any> {
  handleConnection(client: T, ...rest: any[]);
}
