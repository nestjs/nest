import { Logger, Type } from '@nestjs/common';
import * as net from 'net';
import { EmptyError, lastValueFrom } from 'rxjs';
import { share, tap } from 'rxjs/operators';
import {
  CLOSE_EVENT,
  ECONNREFUSED,
  ERROR_EVENT,
  LOCAL_DOMAIN_DEFAULT_PATH,
  LOCAL_DOMAIN_DEFAULT_PATH_WIN32,
  MESSAGE_EVENT,
} from '../constants';
import { JsonLocalDomainSocket, LocalDomainSocket } from '../helpers';
import { PacketId, ReadPacket, WritePacket } from '../interfaces';
import { LocalDomainClientOptions } from '../interfaces';
import { ClientProxy } from './client-proxy';

/**
 * @publicApi
 */
export class ClientLocalDomain extends ClientProxy {
  protected connection: Promise<any>;
  private readonly logger = new Logger(ClientLocalDomain.name);
  private readonly path: string;
  private readonly socketClass: Type<LocalDomainSocket>;
  private isConnected = false;
  private socket: LocalDomainSocket;

  constructor(options: LocalDomainClientOptions['options']) {
    super();
    this.path =
      this.getOptionsProp(options, 'path') ||
      (process.platform === 'win32'
        ? LOCAL_DOMAIN_DEFAULT_PATH_WIN32
        : LOCAL_DOMAIN_DEFAULT_PATH);
    this.socketClass =
      this.getOptionsProp(options, 'socketClass') || JsonLocalDomainSocket;

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public connect(): Promise<any> {
    if (this.connection) {
      return this.connection;
    }
    this.socket = this.createSocket();
    this.bindEvents(this.socket);

    const source$ = this.connect$(this.socket.netSocket).pipe(
      tap(() => {
        this.isConnected = true;
        this.socket.on(MESSAGE_EVENT, (buffer: WritePacket & PacketId) =>
          this.handleResponse(buffer),
        );
      }),
      share(),
    );

    this.socket.connect(this.path);
    this.connection = lastValueFrom(source$).catch(err => {
      if (err instanceof EmptyError) {
        return;
      }
      throw err;
    });

    return this.connection;
  }

  public async handleResponse(buffer: unknown): Promise<void> {
    const { err, response, isDisposed, id } =
      await this.deserializer.deserialize(buffer);
    const callback = this.routingMap.get(id);
    if (!callback) {
      return undefined;
    }
    if (isDisposed || err) {
      return callback({
        err,
        response,
        isDisposed: true,
      });
    }
    callback({
      err,
      response,
    });
  }

  public createSocket(): LocalDomainSocket {
    const socket: net.Socket = new net.Socket();
    return new this.socketClass(socket);
  }

  public close() {
    this.socket && this.socket.end();
    this.handleClose();
  }

  public bindEvents(socket: LocalDomainSocket) {
    socket.on(
      ERROR_EVENT,
      (err: any) => err.code !== ECONNREFUSED && this.handleError(err),
    );
    socket.on(CLOSE_EVENT, () => this.handleClose());
  }

  public handleError(err: any) {
    this.logger.error(err);
  }

  public handleClose() {
    this.isConnected = false;
    this.socket = null;
    this.connection = undefined;

    if (this.routingMap.size > 0) {
      const err = new Error('Connection closed');
      for (const callback of this.routingMap.values()) {
        callback({ err });
      }
      this.routingMap.clear();
    }
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    try {
      const packet = this.assignPacketId(partialPacket);
      const serializedPacket = this.serializer.serialize(packet);

      this.routingMap.set(packet.id, callback);
      this.socket.sendMessage(serializedPacket);

      return () => this.routingMap.delete(packet.id);
    } catch (err) {
      callback({ err });
    }
  }

  protected async dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket = this.serializer.serialize({
      ...packet,
      pattern,
    });
    return this.socket.sendMessage(serializedPacket);
  }
}
