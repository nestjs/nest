import * as io from 'socket.io';
import { Server } from 'http';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import { CONNECTION_EVENT, DISCONNECT_EVENT } from '../constants';
import { WebSocketAdapter } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { filter, tap, mergeMap } from 'rxjs/operators';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { isFunction } from '@nestjs/common/utils/shared.utils';

export class IoAdapter implements WebSocketAdapter {
  constructor(private readonly httpServer: Server | null = null) {}

  public create(port: number, options?: any & { namespace?: string, server?: any}): any {
    if (!options) {
      return this.createIOServer(port);
    }
    const { namespace, server, ...opt } = options;
    return server && isFunction(server.of)
      ? server.of(namespace)
      : namespace 
        ? this.createIOServer(port, opt).of(namespace)
        : this.createIOServer(port, opt);
  }

  public createIOServer(port: number, options?: any): any {
    if (this.httpServer && port === 0) {
      return io(this.httpServer, options);
    }
    return io(port, options);
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
          mergeMap(data => process(callback(data))),
          filter(result => !!result && result.event),
        )
        .subscribe(({ event, data }) => client.emit(event, data)),
    );
  }

  public bindMiddleware(server, middleware: (socket, next) => void) {
    server.use(middleware);
  }

  public close(server) {
    isFunction(server.close) && server.close();
  }
}
