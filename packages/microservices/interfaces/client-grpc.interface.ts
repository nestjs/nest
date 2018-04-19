export interface ClientGrpc {
  getService<T = any>(name: string): T;
}
