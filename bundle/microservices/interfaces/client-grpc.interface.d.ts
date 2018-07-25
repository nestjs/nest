export interface ClientGrpc {
    getService<T extends {}>(name: string): T;
}
