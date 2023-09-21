/// <reference types="bun-types" />

import { EventEmitter } from 'node:events';
import { getRandomValues } from 'node:crypto';

import { Server, ServerWebSocket, ServerWebSocketSendStatus } from 'bun';
import {
  AbstractWsAdapter,
  BaseWsInstance,
  MessageMappingProperties,
} from '@nestjs/websockets';
import {
  EMPTY,
  Observable,
  filter,
  first,
  fromEvent,
  mergeMap,
  share,
  takeUntil,
} from 'rxjs';
import { Buffer } from 'buffer';

enum READY_STATE {
  CONNECTING_STATE = 0,
  OPEN_STATE = 1,
  CLOSING_STATE = 2,
  CLOSED_STATE = 3,
}
export const CONNECTION_EVENT = 'connection';
export const DISCONNECT_EVENT = 'disconnect';
export const CLOSE_EVENT = 'close';
export const ERROR_EVENT = 'error';

interface SocketData {
  socketId: string;
}

const isUndefined = (obj: any): obj is undefined => typeof obj === 'undefined';
const isNil = (val: any): val is null | undefined =>
  isUndefined(val) || val === null;

class BunWsClient<T> implements BaseWsInstance {
  #emitter: EventEmitter;
  #ws: ServerWebSocket<T>;

  constructor(ws: ServerWebSocket<T>) {
    this.#emitter = new EventEmitter();
    this.#ws = ws;
  }
  on(event: string, callback: (data: any) => void) {
    this.#emitter.on(event, callback);
  }
  off(event: string, callback: (data: any) => void) {
    this.#emitter.off(event, callback);
  }
  emit(event: string, data?: any) {
    this.#emitter.emit(event, data);
  }
  send(
    data: string | BufferSource,
    compress?: boolean,
  ): ServerWebSocketSendStatus {
    return this.#ws.send(data, compress);
  }
  get readyState() {
    return this.#ws.readyState;
  }
  close(code?: number, reason?: string) {
    this.#ws.close(code, reason);
  }
}

class BunWsServer implements BaseWsInstance {
  #connections: Map<string, BunWsClient<SocketData>>;
  #emitter: EventEmitter;
  server: Server;

  constructor(port: number) {
    this.#connections = new Map();
    this.#emitter = new EventEmitter();
    this.server = Bun.serve<SocketData>({
      port,
      fetch: (req, server) => {
        const success = server.upgrade(req, {
          data: {
            socketId: this.#generateSocketId(),
          },
        });
        // upgrade the request to a WebSocket
        if (success) {
          return; // do not return a Response
        }
        return new Response('Upgrade failed :(', { status: 500 });
      },
      websocket: {
        message: (ws, message) => {
          const client = this.getClient(ws.data.socketId);
          client.emit('message', Buffer.from(message));
        },
        open: ws => {
          const client = new BunWsClient<SocketData>(ws);
          this.#emitter.emit('connection', client);
          this.#connections.set(ws.data.socketId, client);
        },
        close: ws => {
          const client = this.getClient(ws.data.socketId);
          this.#connections.delete(ws.data.socketId);
          client.emit('disconnect');
        },
      }, // handlers
    });
  }

  on(event: string, callback: (eventData: any) => void) {
    this.#emitter.on(event, callback);
  }

  close() {
    // clean up
    this.#emitter.removeAllListeners();
    this.server.stop();
  }

  getClient(socketId: string) {
    return this.#connections.get(socketId.toString());
  }

  #generateSocketId() {
    while (true) {
      const randomId = getRandomValues(new Uint32Array(1))[0].toString();
      if (!this.#connections.has(randomId)) {
        return randomId;
      }
    }
  }
}

/**
 * @publicApi
 */
export class BunWsAdapter extends AbstractWsAdapter<
  BunWsServer,
  BunWsClient<SocketData>
> {
  public create(port: number) {
    return new BunWsServer(port);
  }

  public bindMessageHandlers(
    client: BunWsClient<SocketData>,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    const close$ = fromEvent(client, CLOSE_EVENT).pipe(share(), first());
    const source$ = fromEvent(client, 'message').pipe(
      mergeMap((data: Buffer) =>
        this.bindMessageHandler(data, handlers, transform).pipe(
          filter(result => !isNil(result)),
        ),
      ),
      takeUntil(close$),
    );
    const onMessage = (response: any) => {
      if (client.readyState !== READY_STATE.OPEN_STATE) {
        return;
      }
      client.send(JSON.stringify(response));
    };
    source$.subscribe(onMessage);
  }

  public bindMessageHandler(
    buffer: Buffer,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ): Observable<any> {
    try {
      const message = JSON.parse(buffer.toString());
      const messageHandler = handlers.find(
        handler => handler.message === message.event,
      );
      const { callback } = messageHandler;
      return transform(callback(message.data, message.event));
    } catch (e) {
      return EMPTY;
    }
  }
}
