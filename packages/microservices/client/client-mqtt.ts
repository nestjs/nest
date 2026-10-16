import { createRequire } from 'module';
import { EmptyError, fromEvent, lastValueFrom, merge, Observable } from 'rxjs';
import { first, map, share, tap } from 'rxjs/operators';
import {
  ECONNREFUSED,
  ENOTFOUND,
  MQTT_DEFAULT_URL,
  MQTT_MAX_TOPIC_LENGTH,
} from '../constants.js';
import { MaxMqttTopicLengthExceededException } from '../errors/max-mqtt-topic-length-exceeded.exception.js';
import {
  MqttEvents,
  MqttEventsMap,
  MqttStatus,
} from '../events/mqtt.events.js';
import {
  IncomingResponse,
  MqttOptions,
  ReadPacket,
  WritePacket,
} from '../interfaces/index.js';
import {
  MqttRecord,
  MqttRecordOptions,
} from '../record-builders/mqtt.record-builder.js';
import { MqttRecordSerializer } from '../serializers/mqtt-record.serializer.js';
import { ClientProxy } from './client-proxy.js';
import { Logger } from '@nestjs/common';
import { loadPackageSync, isObject } from '@nestjs/common/internal';

let mqttPackage: any = {};

// To enable type safety for MQTT. This cant be uncommented by default
// because it would require the user to install the mqtt package even if they dont use MQTT
// Otherwise, TypeScript would fail to compile the code.
//
// type MqttClient = import('mqtt').MqttClient;
type MqttClient = any;

/**
 * @publicApi
 */
export class ClientMqtt extends ClientProxy<MqttEvents, MqttStatus> {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly subscriptionsCount = new Map<string, number>();
  protected readonly url: string;
  /* eslint-disable @typescript-eslint/no-redundant-type-constituents */
  protected mqttClient: MqttClient | null = null;
  protected connectionPromise: Promise<any> | null = null;
  protected isInitialConnection = false;
  protected isReconnecting = false;
  protected pendingEventListeners: Array<{
    event: keyof MqttEvents;
    callback: MqttEvents[keyof MqttEvents];
  }> = [];

  constructor(protected readonly options: Required<MqttOptions>['options']) {
    super();
    this.url = this.getOptionsProp(this.options, 'url') ?? MQTT_DEFAULT_URL;

    mqttPackage = loadPackageSync('mqtt', ClientMqtt.name, () =>
      createRequire(import.meta.url)('mqtt'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public getRequestPattern(pattern: string): string {
    return pattern;
  }

  public getResponsePattern(pattern: string): string {
    return `${pattern}/reply`;
  }

  public async close() {
    this.handleClose();
    if (this.mqttClient) {
      await this.mqttClient.endAsync();
    }
    this.mqttClient = null;
    this.connectionPromise = null;
    this.isInitialConnection = false;
    this.subscriptionsCount.clear();
    this.pendingEventListeners = [];
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
    if (this.mqttClient) {
      return this.connectionPromise!;
    }
    const mqttClient = this.createClient();
    this.mqttClient = mqttClient;
    this.registerErrorListener(mqttClient);
    this.registerOfflineListener(mqttClient);
    this.registerReconnectListener(mqttClient);
    this.registerConnectListener(mqttClient);
    this.registerDisconnectListener(mqttClient);
    this.registerCloseListener(mqttClient);

    this.pendingEventListeners.forEach(({ event, callback }) =>
      mqttClient.on(event, callback),
    );

    const connect$ = this.connect$(mqttClient);
    const connectionPromise = lastValueFrom(
      this.mergeCloseEvent(mqttClient, connect$).pipe(share()),
    ).catch(err => {
      if (err instanceof EmptyError) {
        return;
      }
      // A client that does not reconnect on its own (reconnectPeriod 0) would
      // otherwise stay cached as the rejected attempt, so every later
      // connect() call replays the rejection instead of trying again.
      if (
        this.connectionPromise === connectionPromise &&
        mqttClient.options?.reconnectPeriod === 0
      ) {
        this.discardClient(mqttClient);
      }
      throw err;
    });
    this.connectionPromise = connectionPromise;
    return connectionPromise;
  }

  /**
   * Drops `client` when it is still the current one, so the next `connect()`
   * call starts over with a new client. Events a dropped client emits from now
   * on are ignored.
   */
  private discardClient(client: MqttClient) {
    if (client !== this.mqttClient) {
      return;
    }
    // Requests sent through the dropped client can no longer get a reply
    this.handleClose();
    this.mqttClient = null;
    this.connectionPromise = null;
    // The next client has to attach the response listener and subscribe to
    // the reply channels again
    this.isInitialConnection = false;
    this.subscriptionsCount.clear();
  }

  public mergeCloseEvent<T = any>(
    instance: MqttClient,
    source$: Observable<T>,
  ): Observable<T> {
    const close$ = fromEvent(instance, MqttEventsMap.CLOSE).pipe(
      tap({
        next: () => {
          this._status$.next(MqttStatus.CLOSED);
        },
      }),
      map((err: any) => {
        throw err;
      }),
    );
    return merge(source$, close$).pipe(first());
  }

  public createClient(): MqttClient {
    return mqttPackage.connect(this.url, this.options as MqttOptions);
  }

  public registerErrorListener(client: MqttClient) {
    client.on(MqttEventsMap.ERROR, (err: any) => {
      if (err.code === ECONNREFUSED || err.code === ENOTFOUND) {
        return;
      }
      this.logger.error(err);
    });
  }

  public registerOfflineListener(client: MqttClient) {
    client.on(MqttEventsMap.OFFLINE, () => {
      this.connectionPromise = Promise.reject(
        'Error: Connection lost. Trying to reconnect...',
      );

      // Prevent unhandled rejections
      this.connectionPromise.catch(() => {});
      this.logger.error('MQTT broker went offline.');
    });
  }

  public registerReconnectListener(client: MqttClient) {
    client.on(MqttEventsMap.RECONNECT, () => {
      this.isReconnecting = true;
      this._status$.next(MqttStatus.RECONNECTING);

      this.logger.log('MQTT connection lost. Trying to reconnect...');
    });
  }

  public registerDisconnectListener(client: MqttClient) {
    client.on(MqttEventsMap.DISCONNECT, () => {
      this._status$.next(MqttStatus.DISCONNECTED);
    });
  }

  public registerCloseListener(client: MqttClient) {
    client.on(MqttEventsMap.CLOSE, () => {
      this._status$.next(MqttStatus.CLOSED);

      // mqtt reconnects on the same client only while reconnectPeriod is set.
      // Once it gives up, drop the client so the next connect() call starts
      // over instead of returning the promise of a connection that is gone.
      // A reconnect the broker refused (CONNACK error) leaves "reconnecting"
      // set although mqtt gives up then too, so also check that its own
      // "close" listener, which runs first, scheduled another attempt. Its
      // timer is null when there is none.
      const willReconnect =
        client.reconnecting && client.reconnectTimer !== null;
      if (client === this.mqttClient && !willReconnect) {
        this.discardClient(client);
      }
    });
  }

  public registerConnectListener(client: MqttClient) {
    client.on(MqttEventsMap.CONNECT, () => {
      this.isReconnecting = false;
      this._status$.next(MqttStatus.CONNECTED);

      this.logger.log('Connected to MQTT broker');
      this.connectionPromise = Promise.resolve();

      if (!this.isInitialConnection) {
        this.isInitialConnection = true;
        client.on('message', this.createResponseCallback());
      }
    });
  }

  public on<
    EventKey extends keyof MqttEvents = keyof MqttEvents,
    EventCallback extends MqttEvents[EventKey] = MqttEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    // Kept until `close()`, so the clients created later (e.g., after a
    // failed connect) get it as well
    this.pendingEventListeners.push({ event, callback });
    if (this.mqttClient) {
      this.mqttClient.on(event, callback as any);
    }
  }

  public unwrap<T>(): T {
    if (!this.mqttClient) {
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
    return this.mqttClient as T;
  }

  public createResponseCallback(): (channel: string, buffer: Buffer) => any {
    return async (channel: string, buffer: Buffer) => {
      let packet: any;
      try {
        packet = JSON.parse(buffer.toString());
      } catch (err) {
        this.logger.debug(
          'MQTT response packet is not in json format, bypassing...',
        );
        packet = buffer.toString();
      }
      let incomingResponse: IncomingResponse;
      try {
        incomingResponse = await this.deserializer.deserialize(packet);
      } catch (error) {
        // Only the deserializer knows the id, so no request can be failed here.
        // Nobody awaits this listener, so a rejection would crash the process.
        this.logger.error(
          `Dropped a response that the deserializer failed on: ${error}`,
          (error as Error)?.stack,
        );
        return;
      }
      const { err, response, isDisposed, id } = incomingResponse;

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
    };
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    let undoBookkeeping = () => {};
    try {
      const packet = this.assignPacketId(partialPacket);
      const pattern = this.normalizePattern(partialPacket.pattern);
      const responseChannel = this.getResponsePattern(pattern);
      this.assertTopicLength(this.getRequestPattern(pattern));
      this.assertTopicLength(responseChannel);

      // Counted right away rather than once published: a request that waits
      // for the broker to acknowledge the subscription depends on it as well,
      // so a concurrent request that finishes first must not unsubscribe.
      const subscriptionsCount =
        this.subscriptionsCount.get(responseChannel) || 0;
      this.subscriptionsCount.set(responseChannel, subscriptionsCount + 1);
      let isCounted = true;

      undoBookkeeping = () => {
        if (!isCounted) {
          return;
        }
        isCounted = false;
        this.setSubscriptionsCount(
          responseChannel,
          (this.subscriptionsCount.get(responseChannel) || 1) - 1,
        );
        this.routingMap.delete(packet.id);
      };

      const publishPacket = () => {
        if (!isCounted) {
          return;
        }
        this.routingMap.set(packet.id, callback);

        try {
          const options =
            isObject(packet?.data) && packet.data instanceof MqttRecord
              ? packet.data.options
              : undefined;
          const serializedPacket: string | Buffer =
            this.serializer.serialize(packet);

          this.mqttClient!.publish(
            this.getRequestPattern(pattern),
            serializedPacket,
            this.mergePacketOptions(options),
            (err?: Error) => {
              if (err && isCounted) {
                undoBookkeeping();
                callback({ err });
              }
            },
          );
        } catch (err) {
          // The broker can acknowledge the subscription later, so this runs
          // outside the outer catch and has to undo its own work. Only the
          // bookkeeping though, as in #17822: the next request on this
          // pattern reuses the subscription.
          undoBookkeeping();
          callback({ err });
        }
      };

      const cleanup = () => {
        if (!isCounted) {
          return;
        }
        isCounted = false;
        this.unsubscribeFromChannel(responseChannel);
        this.routingMap.delete(packet.id);
      };

      if (subscriptionsCount <= 0) {
        this.mqttClient!.subscribe(responseChannel, (err: any) => {
          if (err) {
            undoBookkeeping();
            return callback({ err });
          }
          publishPacket();
        });
      } else {
        publishPacket();
      }

      return cleanup;
    } catch (err) {
      undoBookkeeping();
      callback({ err });
      return () => {};
    }
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    this.assertTopicLength(pattern);
    const options =
      isObject(packet?.data) && packet.data instanceof MqttRecord
        ? packet.data.options
        : undefined;

    const serializedPacket: string | Buffer = this.serializer.serialize(packet);
    return new Promise<void>((resolve, reject) =>
      this.mqttClient!.publish(
        pattern,
        serializedPacket,
        this.mergePacketOptions(options),
        (err: any) => (err ? reject(err) : resolve()),
      ),
    );
  }

  protected unsubscribeFromChannel(channel: string) {
    const subscriptionCount = this.subscriptionsCount.get(channel)!;
    this.setSubscriptionsCount(channel, subscriptionCount - 1);

    if (subscriptionCount - 1 <= 0) {
      this.mqttClient!.unsubscribe(channel);
    }
  }

  /**
   * Keeps only the channels that requests wait on. Patterns can be built from
   * request data (e.g., one per device), so a channel nobody waits on any
   * longer must not leave an entry behind.
   */
  private setSubscriptionsCount(channel: string, count: number) {
    if (count > 0) {
      this.subscriptionsCount.set(channel, count);
    } else {
      this.subscriptionsCount.delete(channel);
    }
  }

  /**
   * A topic's length is encoded in two bytes. mqtt.js only fails on a longer
   * topic once it has written the start of the packet, so the broker would
   * read the packets sent after it as the rest of that packet.
   */
  protected assertTopicLength(topic: string) {
    const length = Buffer.byteLength(topic);
    if (length > MQTT_MAX_TOPIC_LENGTH) {
      throw new MaxMqttTopicLengthExceededException(
        length,
        MQTT_MAX_TOPIC_LENGTH,
      );
    }
  }

  protected initializeSerializer(options: MqttOptions['options']) {
    this.serializer = options?.serializer ?? new MqttRecordSerializer();
  }

  protected mergePacketOptions(
    requestOptions?: MqttRecordOptions,
  ): MqttRecordOptions | undefined {
    if (!requestOptions && !this.options?.userProperties) {
      return undefined;
    }

    // Cant just spread objects as MQTT won't deliver
    // any message with empty object as "userProperties" field
    // @url https://github.com/nestjs/nest/issues/14079
    let options: MqttRecordOptions = {};
    if (requestOptions) {
      options = { ...requestOptions };
    }
    if (this.options?.userProperties) {
      options.properties = {
        ...options.properties,
        userProperties: {
          ...this.options?.userProperties,
          ...options.properties?.userProperties,
        },
      };
    }
    return options;
  }
}
