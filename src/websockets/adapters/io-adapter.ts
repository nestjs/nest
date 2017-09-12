import * as io from 'socket.io';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import { CONNECTION_EVENT, DISCONNECT_EVENT } from './../constants';
import { WebSocketAdapter } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/filter';

export class IoAdapter implements WebSocketAdapter {
    public create(port: number) {
        return io(port);
    }

    public createWithNamespace(port: number, namespace: string) {
        return io(port).of(namespace);
    }

    public bindClientConnect(server, callback: (...args) => void) {
        server.on(CONNECTION_EVENT, callback);
    }

    public bindClientDisconnect(client, callback: (...args) => void) {
        client.on(DISCONNECT_EVENT, callback);
    }

    public bindMessageHandlers(
        client,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ) {
        handlers.forEach(({ message, callback }) => Observable.fromEvent(client, message)
            .switchMap((data) => process(callback(data)))
            .filter((result) => !!result && result.event)
            .subscribe(({ event, data }) => client.emit(event, data)),
        );
    }

    public bindMiddleware(server, middleware: (socket, next) => void) {
        server.use(middleware);
    }
}