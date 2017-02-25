import * as io from 'socket.io';

export class IoAdapter {

    static create(port: number) {
        return io(port);
    }

    static createWithNamespace(port: number, namespace: string) {
        return io(port).of(namespace);
    }

}