import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { EventEmitter } from 'stream';
import { NATS_DEFAULT_URL } from '../constants';
import { NatsResponseJSONDeserializer } from '../deserializers/nats-response-json.deserializer';
import { EmptyResponseException } from '../errors/empty-response.exception';
import { NatsEvents, NatsEventsMap, NatsStatus } from '../events/nats.events';
import { NatsOptions, PacketId, ReadPacket, WritePacket } from '../interfaces';
import { NatsRecord } from '../record-builders';
import { NatsRecordSerializer } from '../serializers/nats-record.serializer';
import { ClientProxy } from './client-proxy';

let natsPackage = {} as any;

// To enable type safety for Nats. This cant be uncommented by default
// because it would require the user to install the nats package even if they dont use Nats
// Otherwise, TypeScript would fail to compile the code.
//
// type Client = import('nats').NatsConnection;
// type NatsMsg = import('nats').Msg;

type Client = Record<string, any>;
type NatsMsg = Record<string, any>;

/**
 * @publicApi
 */
export class ClientNats extends ClientProxy<NatsEvents, NatsStatus> {
  protected readonly logger = new Logger(ClientNats.name);

  protected natsClient: Client | null = null;
  protected connectionPromise: Promise<Client> | null = null;
  protected statusEventEmitter = new EventEmitter<{
    [key in keyof NatsEvents]: Parameters<NatsEvents[key]>;
  }>();

  constructor(protected readonly options: Required<NatsOptions>['options']) {
    super();
    natsPackage = loadPackage('nats', ClientNats.name, () => require('nats'));

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async close() {
    await this.natsClient?.close();
    this.statusEventEmitter.removeAllListeners();

    this.natsClient = null;
    this.connectionPromise = null;
  }

  public async connect(): Promise<any> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    this.connectionPromise = this.createClient();
    this.natsClient = await this.connectionPromise.catch(err => {
      this.connectionPromise = null;
      throw err;
    });

    this._status$.next(NatsStatus.CONNECTED);
    void this.handleStatusUpdates(this.natsClient);
    return this.natsClient;
  }

  public createClient(): Promise<Client> {
    const options = this.options || ({} as NatsOptions);
    return natsPackage.connect({
      servers: NATS_DEFAULT_URL,
      ...options,
    });
  }

  public async handleStatusUpdates(client: Client) {
    for await (const status of client.status()) {
      const data =
        status.data && isObject(status.data)
          ? JSON.stringify(status.data)
          : status.data;

      switch (status.type) {
        case 'error':
          this.logger.error(
            `NatsError: type: "${status.type}", data: "${data}".`,
          );
          break;

        case 'disconnect':
          this.connectionPromise = Promise.reject(
            'Error: Connection lost. Trying to reconnect...',
          );
          // Prevent unhandled promise rejection
          this.connectionPromise.catch(() => {});

          this.logger.error(
            `NatsError: type: "${status.type}", data: "${data}".`,
          );

          this._status$.next(NatsStatus.DISCONNECTED);
          this.statusEventEmitter.emit(
            NatsEventsMap.DISCONNECT,
            status.data as string,
          );
          break;

        case 'reconnecting':
          this._status$.next(NatsStatus.RECONNECTING);
          break;

        case 'reconnect':
          this.connectionPromise = Promise.resolve(client);
          this.logger.log(
            `NatsStatus: type: "${status.type}", data: "${data}".`,
          );

          this._status$.next(NatsStatus.CONNECTED);
          this.statusEventEmitter.emit(
            NatsEventsMap.RECONNECT,
            status.data as string,
          );
          break;

        case 'pingTimer':
          if (this.options.debug) {
            this.logger.debug(
              `NatsStatus: type: "${status.type}", data: "${data}".`,
            );
          }
          break;

        case 'update':
          this.logger.log(
            `NatsStatus: type: "${status.type}", data: "${data}".`,
          );
          this.statusEventEmitter.emit(NatsEventsMap.UPDATE, status.data);
          break;

        default:
          this.logger.log(
            `NatsStatus: type: "${status.type}", data: "${data}".`,
          );
          break;
      }
    }
  }

  public on<
    EventKey extends keyof NatsEvents = keyof NatsEvents,
    EventCallback extends NatsEvents[EventKey] = NatsEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    this.statusEventEmitter.on(event, callback as any);
  }

  public unwrap<T>(): T {
    if (!this.natsClient) {
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
    return this.natsClient as T;
  }

  public createSubscriptionHandler(
    packet: ReadPacket & PacketId,
    callback: (packet: WritePacket) => any,
  ) {
    return async (error: string | Error | undefined, natsMsg: NatsMsg) => {
      if (error) {
        return callback({
          err: error,
        });
      }
      const rawPacket = natsMsg.data;
      if (rawPacket?.length === 0) {
        return callback({
          err: new EmptyResponseException(
            this.normalizePattern(packet.pattern),
          ),
          isDisposed: true,
        });
      }
      const message = await this.deserializer.deserialize(rawPacket);
      if (message.id && message.id !== packet.id) {
        return undefined;
      }
      const { err, response, isDisposed } = message;
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
    };
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    try {
      const packet = this.assignPacketId(partialPacket);
      const channel = this.normalizePattern(partialPacket.pattern);
      const serializedPacket: NatsRecord = this.serializer.serialize(packet);
      const inbox = natsPackage.createInbox(this.options.inboxPrefix);

      const subscriptionHandler = this.createSubscriptionHandler(
        packet,
        callback,
      );

      const subscription = this.natsClient!.subscribe(inbox, {
        callback: subscriptionHandler,
      });

      const headers = this.mergeHeaders(serializedPacket.headers);
      this.natsClient!.publish(channel, serializedPacket.data, {
        reply: inbox,
        headers,
      });

      return () => subscription.unsubscribe();
    } catch (err) {
      callback({ err });
      return () => {};
    }
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket: NatsRecord = this.serializer.serialize(packet);
    const headers = this.mergeHeaders(serializedPacket.headers);

    return new Promise<void>((resolve, reject) => {
      try {
        this.natsClient!.publish(pattern, serializedPacket.data, {
          headers,
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  protected initializeSerializer(options: NatsOptions['options']) {
    this.serializer = options?.serializer ?? new NatsRecordSerializer();
  }

  protected initializeDeserializer(options: NatsOptions['options']) {
    this.deserializer =
      options?.deserializer ?? new NatsResponseJSONDeserializer();
  }

  protected mergeHeaders<THeaders = any>(requestHeaders?: THeaders) {
    if (!requestHeaders && !this.options?.headers) {
      return undefined;
    }

    const headers = requestHeaders ?? natsPackage.headers();

    for (const [key, value] of Object.entries(this.options?.headers || {})) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }

    return headers;
  }
}
