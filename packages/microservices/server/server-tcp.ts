import { isString } from '@nestjs/common/utils/shared.utils';
import * as JsonSocket from 'json-socket';
import * as net from 'net';
import { Server as NetSocket } from 'net';
import { Observable } from 'rxjs';
import {
  CLOSE_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
  NO_PATTERN_MESSAGE,
  TCP_DEFAULT_PORT,
} from '../constants';
import { CustomTransportStrategy, PacketId, ReadPacket } from '../interfaces';
import {
  MicroserviceOptions,
  TcpOptions,
} from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

export class ServerTCP extends Server implements CustomTransportStrategy {
  private readonly port: number;
  private server: NetSocket;
  private isExplicitlyTerminated = false;
  private retryAttemptsCount = 0;

  constructor(private readonly options: MicroserviceOptions['options']) {
    super();
    this.port =
      this.getOptionsProp<TcpOptions>(options, 'port') || TCP_DEFAULT_PORT;
    this.init();
  }

  public listen(callback: () => void) {
    this.server.listen(this.port, callback);
  }

  public close() {
    this.isExplicitlyTerminated = true;
    this.server.close();
  }

  public bindHandler(socket) {
    const readSocket = this.getSocketInstance(socket);
    readSocket.on(MESSAGE_EVENT, async msg =>
      this.handleMessage(readSocket, msg),
    );
  }

  public async handleMessage(socket, packet: ReadPacket & PacketId) {
    const pattern = !isString(packet.pattern)
      ? JSON.stringify(packet.pattern)
      : packet.pattern;
    const status = 'error';

    if (!this.messageHandlers[pattern]) {
      return socket.sendMessage({
        id: packet.id,
        status,
        err: NO_PATTERN_MESSAGE,
      });
    }
    const handler = this.messageHandlers[pattern];
    const response$ = this.transformToObservable(
      await handler(packet.data),
    ) as Observable<any>;
    response$ &&
      this.send(response$, data =>
        socket.sendMessage(Object.assign(data, { id: packet.id })),
      );
  }

  public handleClose(): undefined | number | NodeJS.Timer {
    if (
      this.isExplicitlyTerminated ||
      !this.getOptionsProp<TcpOptions>(this.options, 'retryAttempts') ||
      this.retryAttemptsCount >=
        this.getOptionsProp<TcpOptions>(this.options, 'retryAttempts')
    ) {
      return undefined;
    }
    ++this.retryAttemptsCount;
    return setTimeout(
      () => this.server.listen(this.port),
      this.getOptionsProp<TcpOptions>(this.options, 'retryDelay') || 0,
    );
  }

  private init() {
    this.server = net.createServer(this.bindHandler.bind(this));
    this.server.on(ERROR_EVENT, this.handleError.bind(this));
    this.server.on(CLOSE_EVENT, this.handleClose.bind(this));
  }

  private getSocketInstance(socket): JsonSocket {
    return new JsonSocket(socket);
  }
}
