export interface GatewayMiddleware {
    resolve(): (socket: any, next: any) => void;
}
