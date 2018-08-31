export interface OnGatewayConnection<T = any> {
    handleConnection(client: T, ...args: any[]): any;
}
