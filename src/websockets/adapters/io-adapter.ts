import * as io from 'socket.io';
import { Server } from 'http';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import { CONNECTION_EVENT, DISCONNECT_EVENT } from '../constants';
import { WebSocketAdapter } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { switchMap, filter, tap } from 'rxjs/operators';
import { fromEvent } from 'rxjs/observable/fromEvent';

export class IoAdapter implements WebSocketAdapter {
  constructor(private readonly httpServer: Server | null = null) {}

  public create(port: number) {
    return this.createIOServer(port);
  }

  public createWithNamespace(port: number, namespace: string, server?: any) {
    return server
      ? server.of(namespace)
      : this.createIOServer(port).of(namespace);
  }

  public createIOServer(port: number) {
    if (this.httpServer && port === 0) {
      return io.listen(this.httpServer);
    }
    return io(port);
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
    handlers.forEach(({ message, callback }) =>
      fromEvent(client, message)
        .pipe(
          switchMap(data => process(callback(data))),
          filter(result => !!result && result.event),
        )
        .subscribe(({ event, data }) => client.emit(event, data)),
    );
  }

  public bindMiddleware(server, middleware: (socket, next) => void) {
    server.use(middleware);
  }
}
