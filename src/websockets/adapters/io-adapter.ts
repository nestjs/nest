import * as io from 'socket.io';

export class IoAdapter {
    public static create(port: number) {
        return io(port);
    }

    public static createWithNamespace(port: number, namespace: string) {
        return io(port).of(namespace);
    }
}