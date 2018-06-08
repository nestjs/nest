export interface ClientGrpc {
  getService<T extends {}>(name: keyof T): T;
}
