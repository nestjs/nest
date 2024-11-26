/**
 * @publicApi
 */
export interface ClientGrpc {
  /**
   * Returns an instance of the given gRPC service.
   * @param name Service name
   * @returns gRPC service
   */
  getService<T extends object>(name: string): T;
  /**
   * Returns an instance of the given gRPC client.
   * @param name Service name
   * @returns gRPC client
   */
  getClientByServiceName<T = any>(name: string): T;
}
