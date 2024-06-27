import { Type } from '@nestjs/common';
import { isString, isUndefined } from '@nestjs/common/utils/shared.utils';
import * as net from 'net';
import { Server as NetSocket, Socket } from 'net';
import {
  CLOSE_EVENT,
  EADDRINUSE,
  ECONNREFUSED,
  ERROR_EVENT,
  MESSAGE_EVENT,
  NO_MESSAGE_HANDLER,
} from '../constants';
import { LocalDomainContext } from '../ctx-host';
import { Transport } from '../enums';
import { LocalDomainSocket, JsonLocalDomainSocket } from '../helpers';
import {
  CustomTransportStrategy,
  IncomingRequest,
  PacketId,
  ReadPacket,
  WritePacket,
} from '../interfaces';
import { LocalDomainOptions } from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

/**
 * @publicApi
 */
export class ServerLocalDomain
  extends Server
  implements CustomTransportStrategy
{
  public readonly transportId = Transport.LOCAL_DOMAIN;

  protected server: NetSocket;

  private readonly path: string;
  private readonly socketClass: Type<LocalDomainSocket>;
  private isExplicitlyTerminated = false;
  private retryAttemptsCount = 0;

  constructor(private readonly options: LocalDomainOptions['options']) {
    super();
    this.path = this.getOptionsProp(options, 'path');
    this.socketClass =
      this.getOptionsProp(options, 'socketClass') || JsonLocalDomainSocket;

    this.init();
    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    this.server.once(ERROR_EVENT, (err: Record<string, unknown>) => {
      if (err?.code === EADDRINUSE || err?.code === ECONNREFUSED) {
        return callback(err);
      }
    });
    this.server.listen(this.path, callback as () => void);
  }

  public close() {
    this.isExplicitlyTerminated = true;

    this.server.close();
  }

  public bindHandler(socket: Socket) {
    const readSocket = this.getSocketInstance(socket);
    readSocket.on(MESSAGE_EVENT, async (msg: ReadPacket & PacketId) =>
      this.handleMessage(readSocket, msg),
    );
    readSocket.on(ERROR_EVENT, this.handleError.bind(this));
  }

  public async handleMessage(socket: LocalDomainSocket, rawMessage: unknown) {
    const packet = await this.deserializer.deserialize(rawMessage);
    const pattern = !isString(packet.pattern)
      ? JSON.stringify(packet.pattern)
      : packet.pattern;

    const localDomainContext = new LocalDomainContext([socket, pattern]);
    if (isUndefined((packet as IncomingRequest).id)) {
      return this.handleEvent(pattern, packet, localDomainContext);
    }
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      const status = 'error';
      const noHandlerPacket = this.serializer.serialize({
        id: (packet as IncomingRequest).id,
        status,
        err: NO_MESSAGE_HANDLER,
      });
      return socket.sendMessage(noHandlerPacket);
    }
    const response$ = this.transformToObservable(
      await handler(packet.data, localDomainContext),
    );

    response$ &&
      this.send(response$, data => {
        Object.assign(data, { id: (packet as IncomingRequest).id });
        const outgoingResponse = this.serializer.serialize(
          data as WritePacket & PacketId,
        );
        socket.sendMessage(outgoingResponse);
      });
  }

  public handleClose(): undefined | number | NodeJS.Timer {
    if (
      this.isExplicitlyTerminated ||
      !this.getOptionsProp(this.options, 'retryAttempts') ||
      this.retryAttemptsCount >=
        this.getOptionsProp(this.options, 'retryAttempts')
    ) {
      return undefined;
    }
    ++this.retryAttemptsCount;
    return setTimeout(
      () => this.server.listen(this.path),
      this.getOptionsProp(this.options, 'retryDelay') || 0,
    );
  }

  private init() {
    this.server = net.createServer(this.bindHandler.bind(this));

    this.server.on(ERROR_EVENT, this.handleError.bind(this));
    this.server.on(CLOSE_EVENT, this.handleClose.bind(this));
  }

  private getSocketInstance(socket: Socket): LocalDomainSocket {
    return new this.socketClass(socket);
  }
}
