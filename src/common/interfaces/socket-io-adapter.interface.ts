export interface SocketIoAdapter {
    create(port: number);
    createWithNamespace(port: number, namespace: string);
}