import {
  CONNECTION_FAILED_MESSAGE,
  MQTT_DEFAULT_URL,
  MQTT_MAX_TOPIC_LENGTH,
  MQTT_SEPARATOR,
  MQTT_WILDCARD_ALL,
  MQTT_WILDCARD_SINGLE,
  NO_MESSAGE_HANDLER,
} from '../constants.js';
import { MqttContext } from '../ctx-host/mqtt.context.js';
import { Transport } from '../enums/index.js';
import { MaxMqttTopicLengthExceededException } from '../errors/max-mqtt-topic-length-exceeded.exception.js';
import {
  MqttEvents,
  MqttEventsMap,
  MqttStatus,
} from '../events/mqtt.events.js';
import {
  IncomingRequest,
  MessageHandler,
  PacketId,
  ReadPacket,
} from '../interfaces/index.js';
import {
  MqttOptions,
  TransportId,
} from '../interfaces/microservice-configuration.interface.js';
import { MqttRecord } from '../record-builders/mqtt.record-builder.js';
import { MqttRecordSerializer } from '../serializers/mqtt-record.serializer.js';
import { Server } from './server.js';
import { isUndefined } from '@nestjs/common/internal';

const INFINITE_CONNECTION_ATTEMPTS = -1;

// To enable type safety for MQTT. This cant be uncommented by default
// because it would require the user to install the mqtt package even if they dont use MQTT
// Otherwise, TypeScript would fail to compile the code.
//
// type MqttClient = import('mqtt').MqttClient;
type MqttClient = any;

/**
 * @publicApi
 */
export class ServerMqtt extends Server<MqttEvents, MqttStatus> {
  public transportId: TransportId = Transport.MQTT;
  protected readonly url: string;
  protected mqttClient: MqttClient;
  protected connectionAttempts = 0;
  protected hasConnected = false;
  protected pendingEventListeners: Array<{
    event: keyof MqttEvents;
    callback: MqttEvents[keyof MqttEvents];
  }> = [];

  constructor(private readonly options: Required<MqttOptions>['options']) {
    super();
    this.url = this.getOptionsProp(options, 'url', MQTT_DEFAULT_URL);

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    try {
      // Re-arm the attempts limit so that a restarted server gets a fresh
      // startup window.
      this.connectionAttempts = 0;
      this.hasConnected = false;

      this.mqttClient = await this.createMqttClient();
      this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public start(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    // The bootstrap callback must settle exactly once, no matter whether the
    // connection succeeds or the attempts limit is exhausted first.
    let listenCallback:
      ((err?: unknown, ...optionalParams: unknown[]) => void) | undefined =
      callback;
    const settleListenCallback = (err?: unknown) => {
      const cb = listenCallback;
      listenCallback = undefined;
      isUndefined(err) ? cb?.() : cb?.(err);
    };

    this.registerErrorListener(this.mqttClient, settleListenCallback);
    this.registerReconnectListener(this.mqttClient);
    this.registerDisconnectListener(this.mqttClient);
    this.registerCloseListener(this.mqttClient);
    this.registerConnectListener(this.mqttClient);

    this.pendingEventListeners.forEach(({ event, callback }) =>
      this.mqttClient.on(event, callback),
    );
    this.pendingEventListeners = [];
    this.bindEvents(this.mqttClient);

    this.mqttClient.once(MqttEventsMap.CONNECT, () => settleListenCallback());
  }

  public bindEvents(mqttClient: MqttClient) {
    mqttClient.on('message', this.getMessageHandler(mqttClient).bind(this));

    const registeredPatterns = [...this.messageHandlers.keys()];
    registeredPatterns.forEach(pattern => {
      const handler = this.messageHandlers.get(pattern)!;
      const { isEventHandler, extras } = handler;

      const globalSubscribeOptions = this.getOptionsProp(
        this.options,
        'subscribeOptions',
      );
      const subscribeOptions =
        extras?.qos !== undefined
          ? { ...globalSubscribeOptions, qos: extras.qos }
          : globalSubscribeOptions;

      mqttClient.subscribe(
        isEventHandler ? pattern : this.getRequestPattern(pattern),
        subscribeOptions,
      );
    });
  }

  public close() {
    this.mqttClient && this.mqttClient.end();
    this.pendingEventListeners = [];
  }

  public async createMqttClient(): Promise<MqttClient> {
    const mqttPackage = await this.loadPackage(
      'mqtt',
      ServerMqtt.name,
      () => import('mqtt'),
    );
    // mqtt stops reconnecting for good once the broker refuses a connection
    // (CONNACK error), which would leave the server disconnected. Retry as
    // after any other failed attempt, unless told otherwise.
    return mqttPackage.connect(this.url, {
      reconnectOnConnackError: true,
      ...this.options,
    } as any);
  }

  public getMessageHandler(pub: MqttClient) {
    return async (
      channel: string,
      buffer: Buffer,
      originalPacket?: Record<string, any>,
    ) =>
      this.handleMessage(channel, buffer, pub, originalPacket).catch(err =>
        this.handleError(err),
      );
  }

  public async handleMessage(
    channel: string,
    buffer: Buffer,
    pub: MqttClient,
    originalPacket?: Record<string, any>,
  ): Promise<any> {
    const rawPacket = this.parseMessage(buffer.toString());
    const packet = await this.deserializer.deserialize(rawPacket, { channel });
    const mqttContext = new MqttContext([channel, originalPacket!]);
    if (isUndefined((packet as IncomingRequest).id)) {
      return this.handleEvent(channel, packet, mqttContext);
    }
    this.assertValidPacketId((packet as IncomingRequest).id);
    const publish = this.getPublisher(
      pub,
      mqttContext,
      (packet as IncomingRequest).id,
    );
    const handler = this.getHandlerByPattern(channel);

    if (!handler) {
      const status = 'error';
      const noHandlerPacket = {
        id: (packet as IncomingRequest).id,
        status,
        err: NO_MESSAGE_HANDLER,
      };
      return publish(noHandlerPacket);
    }
    this.warnIfEventHandlerReplies(handler, channel);
    return this.handleRequest(
      mqttContext,
      async () =>
        this.transformToObservable(await handler(packet.data, mqttContext)),
      publish,
    );
  }

  public getPublisher(
    client: MqttClient,
    context: MqttContext,
    id: string,
  ): any {
    // Checked before the handler runs, as none of its replies could be sent
    this.assertTopicLength(this.getReplyPattern(context.getTopic()));

    return (response: any) => {
      Object.assign(response, { id });

      const options =
        response.response instanceof MqttRecord
          ? response.response.options
          : {};

      const outgoingResponse: string | Buffer =
        this.serializer.serialize(response);

      return client.publish(
        this.getReplyPattern(context.getTopic()),
        outgoingResponse,
        options,
      );
    };
  }

  public parseMessage(content: any): ReadPacket & PacketId {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public matchMqttPattern(pattern: string, topic: string) {
    const patternSegments = pattern.split(MQTT_SEPARATOR);
    const topicSegments = topic.split(MQTT_SEPARATOR);

    const patternSegmentsLength = patternSegments.length;
    const topicSegmentsLength = topicSegments.length;
    const lastIndex = patternSegmentsLength - 1;

    for (let i = 0; i < patternSegmentsLength; i++) {
      const currentPattern = patternSegments[i];
      const patternChar = currentPattern[0];
      const currentTopic = topicSegments[i];

      if (isUndefined(currentTopic) && currentPattern !== MQTT_WILDCARD_ALL) {
        return false;
      }
      if (patternChar === MQTT_WILDCARD_ALL) {
        return i === lastIndex;
      }
      if (
        patternChar !== MQTT_WILDCARD_SINGLE &&
        currentPattern !== currentTopic
      ) {
        return false;
      }
    }
    return patternSegmentsLength === topicSegmentsLength;
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
    // The topic is matched as the broker delivered it, which is what its ACLs
    // checked: decoded as JSON, '"admin/reset"' would reach the handler of
    // "admin/reset". Only the topic of an object pattern is decoded, so that
    // its keys are sorted as the handler's are.
    const route = pattern.startsWith('{')
      ? this.getRouteFromPattern(pattern)
      : pattern;
    if (this.messageHandlers.has(route)) {
      return this.messageHandlers.get(route) || null;
    }

    for (const [key, value] of this.messageHandlers) {
      const keyWithoutSharedPrefix = this.removeHandlerKeySharedPrefix(key);
      if (this.matchMqttPattern(keyWithoutSharedPrefix, route)) {
        return value;
      }
    }
    return null;
  }

  public removeHandlerKeySharedPrefix(handlerKey: string) {
    return handlerKey && handlerKey.startsWith('$share')
      ? handlerKey.split('/').slice(2).join('/')
      : handlerKey;
  }

  public getRequestPattern(pattern: string): string {
    return pattern;
  }

  public getReplyPattern(pattern: string): string {
    return `${pattern}/reply`;
  }

  /**
   * A topic's length is encoded in two bytes, and "/reply" can take a topic
   * the broker delivered past it. mqtt.js only fails on a longer topic once it
   * has written the start of the packet, so the broker would read the packets
   * sent after it as the rest of that packet.
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

  public registerErrorListener(
    client: MqttClient,
    callback?: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    client.on(MqttEventsMap.ERROR, (err: unknown) => {
      this.logger.error(err);

      const maxConnectionAttempts = this.getOptionsProp(
        this.options,
        'maxConnectionAttempts',
        INFINITE_CONNECTION_ATTEMPTS,
      );
      // The limit bounds the initial connection only. Once the server has
      // connected, mqtt.js reconnects indefinitely and errors are just logged,
      // so a running microservice is never torn down by this option.
      if (
        maxConnectionAttempts === INFINITE_CONNECTION_ATTEMPTS ||
        this.hasConnected
      ) {
        return;
      }
      if (++this.connectionAttempts === maxConnectionAttempts) {
        this.close();
        callback?.(err ?? new Error(CONNECTION_FAILED_MESSAGE));
      }
    });
  }

  public registerReconnectListener(client: MqttClient) {
    client.on(MqttEventsMap.RECONNECT, () => {
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
    });
  }

  public registerConnectListener(client: MqttClient) {
    client.on(MqttEventsMap.CONNECT, () => {
      this.hasConnected = true;
      this._status$.next(MqttStatus.CONNECTED);
    });
  }

  public unwrap<T>(): T {
    if (!this.mqttClient) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return this.mqttClient as T;
  }

  public on<
    EventKey extends keyof MqttEvents = keyof MqttEvents,
    EventCallback extends MqttEvents[EventKey] = MqttEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    if (this.mqttClient) {
      this.mqttClient.on(event, callback as any);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  protected initializeSerializer(options: MqttOptions['options']) {
    this.serializer = options?.serializer ?? new MqttRecordSerializer();
  }
}
