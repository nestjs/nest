/**
 * @publicApi
 */
export interface ClientGrpc {
  getService<T extends {}>(name: string): T;
  getClientByServiceName<T = any>(name: string): T;
}
