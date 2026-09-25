import { Logger } from '@nestjs/common';
import { isObject, loadPackageSync } from '@nestjs/common/internal';
import { EventEmitter } from 'events';
import { createRequire } from 'module';
import { NATS_DEFAULT_URL } from '../constants.js';
import { NatsResponseJSONDeserializer } from '../deserializers/nats-response-json.deserializer.js';
import { EmptyResponseException } from '../errors/empty-response.exception.js';
import {
  NatsEvents,
  NatsEventsMap,
  NatsStatus,
} from '../events/nats.events.js';
import {
  NatsOptions,
  PacketId,
  ReadPacket,
  WritePacket,
} from '../interfaces/index.js';
import { NatsRecord } from '../record-builders/index.js';
import { NatsRecordSerializer } from '../serializers/nats-record.serializer.js';
import { ClientProxy } from './client-proxy.js';

let natsPackage = {} as any;

// To enable type safety for Nats. This cant be uncommented by default
// because it would require the user to install the nats package even if they dont use Nats
// Otherwise, TypeScript would fail to compile the code.
//
// type Client = import('@nats-io/transport-node').NatsConnection;
// type NatsMsg = import('@nats-io/transport-node').Msg;

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
    natsPackage = loadPackageSync(
      '@nats-io/transport-node',
      ClientNats.name,
      () => createRequire(import.meta.url)('@nats-io/transport-node'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async close() {
    this.handleClose();
    try {
      await this.natsClient?.close();
    } finally {
      this.statusEventEmitter.removeAllListeners();

      this.natsClient = null;
      this.connectionPromise = null;
    }
  }

  public handleClose() {
    if (this.routingMap.size > 0) {
      const err = new Error('Connection closed');
      const callbacks = [...this.routingMap.values()];
      this.routingMap.clear();

      for (const callback of callbacks) {
        try {
          callback({ err });
        } catch (callbackErr) {
          // A failing callback must not keep the remaining requests pending
          // nor prevent the connection from being closed.
          this.logger.error(callbackErr);
        }
      }
    }
  }

  public async connect(): Promise<any> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    const connectionPromise = this.createClient();
    this.connectionPromise = connectionPromise;
    const natsClient = await connectionPromise.catch(err => {
      // A rejected attempt must not be cached, but a newer attempt may have
      // replaced it in the meantime (close() followed by connect() while this
      // attempt was still pending): only reset the shared state when the
      // failing attempt is still the current one, as ClientRedis, ClientRMQ
      // and ClientKafka already do.
      if (this.connectionPromise === connectionPromise) {
        this.connectionPromise = null;
      }
      throw err;
    });
    if (this.connectionPromise !== connectionPromise) {
      // The client was closed (and possibly reconnected) while this attempt
      // was still pending: the connection it opened is no longer tracked by
      // the client, so it must not replace the current one nor stay open.
      await natsClient.close().catch(() => {});
      if (this.connectionPromise) {
        return this.connectionPromise;
      }
      throw new Error('Connection closed');
    }
    this.natsClient = natsClient;

    this._status$.next(NatsStatus.CONNECTED);
    void this.handleStatusUpdates(this.natsClient);
    return this.natsClient;
  }

  public async createClient(): Promise<Client> {
    // Eagerly initialize serializer/deserializer so they can be used synchronously
    if (
      this.serializer &&
      typeof (this.serializer as any).init === 'function'
    ) {
      await (this.serializer as any).init();
    }
    if (
      this.deserializer &&
      typeof (this.deserializer as any).init === 'function'
    ) {
      await (this.deserializer as any).init();
    }

    const options = this.options || ({} as NatsOptions);
    return natsPackage.connect({
      servers: NATS_DEFAULT_URL,
      ...options,
    });
  }

  public async handleStatusUpdates(client: Client) {
    for await (const status of client.status()) {
      switch (status.type) {
        case 'error':
          this.logger.error(
            `NatsError: type: "${status.type}", error: "${status.error}".`,
          );
          break;

        case 'disconnect':
          this.connectionPromise = Promise.reject(
            'Error: Connection lost. Trying to reconnect...',
          );
          // Prevent unhandled promise rejection
          this.connectionPromise.catch(() => {});

          this.logger.error(`NatsError: type: "${status.type}".`);

          this._status$.next(NatsStatus.DISCONNECTED);
          this.statusEventEmitter.emit(
            NatsEventsMap.DISCONNECT,
            status.server as string,
          );
          break;

        case 'reconnecting':
          this._status$.next(NatsStatus.RECONNECTING);
          break;

        case 'reconnect':
          this.connectionPromise = Promise.resolve(client);
          this.logger.log(`NatsStatus: type: "${status.type}".`);

          this._status$.next(NatsStatus.CONNECTED);
          this.statusEventEmitter.emit(
            NatsEventsMap.RECONNECT,
            status.server as string,
          );
          break;

        case 'ping':
          if (this.options.debug) {
            this.logger.debug(
              `NatsStatus: type: "${status.type}", pending pings: "${status.pendingPings}".`,
            );
          }
          break;

        case 'update':
          this.logger.log(
            `NatsStatus: type: "${status.type}", added: "${status.added}", deleted: "${status.deleted}".`,
          );
          this.statusEventEmitter.emit(NatsEventsMap.UPDATE, {
            added: status.added,
            deleted: status.deleted,
          });
          break;

        default: {
          const data =
            'data' in status && isObject(status.data)
              ? JSON.stringify(status.data)
              : 'data' in status
                ? status.data
                : '';
          this.logger.log(
            `NatsStatus: type: "${status.type}", data: "${data}".`,
          );
          break;
        }
      }
    }
    // The status iterator only completes once the client has given up: it was
    // closed, or it exhausted `maxReconnectAttempts` and is not coming back.
    // The promise the "disconnect" case cached is never reset in that case, so
    // every later `connect()` call would replay the same rejection. Drop the
    // client and the cached promise so the next call starts over.
    if (this.natsClient === client) {
      this.natsClient = null;
      this.connectionPromise = null;
    }
  }

  public on<
    EventKey extends keyof NatsEvents = keyof NatsEvents,
    EventCallback extends NatsEvents[EventKey] = NatsEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    this.statusEventEmitter.on(event as string | symbol, callback as any);
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
    return async (error: Error | null, natsMsg: NatsMsg) => {
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
      const message = await this.deserializer.deserialize(natsMsg);
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
    const packet = this.assignPacketId(partialPacket);
    this.routingMap.set(packet.id, callback);

    const cleanup = () => this.routingMap.delete(packet.id);
    const errorCallback = (err: unknown) => {
      cleanup();
      callback({ err });
    };

    try {
      const channel = this.normalizePattern(partialPacket.pattern);
      const serializedPacket: NatsRecord = this.serializer.serialize(
        packet,
      ) as NatsRecord;
      const inbox = natsPackage.createInbox(this.options.inboxPrefix);

      const subscriptionHandler = this.createSubscriptionHandler(
        packet,
        callback,
      );

      const subscription = this.natsClient!.subscribe(inbox, {
        callback: subscriptionHandler as (
          err: Error | null,
          msg: NatsMsg,
        ) => Promise<never>,
      });

      const headers = this.mergeHeaders(serializedPacket.headers);
      this.natsClient!.publish(channel, serializedPacket.data, {
        reply: inbox,
        headers,
      });

      return () => {
        cleanup();
        subscription.unsubscribe();
      };
    } catch (err) {
      errorCallback(err);
      return () => {};
    }
  }

  protected async dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket: NatsRecord =
      await this.serializer.serialize(packet);
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
