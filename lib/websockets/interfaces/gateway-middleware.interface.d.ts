export interface GatewayMiddleware {
  resolve(): (socket, next) => void;
}
