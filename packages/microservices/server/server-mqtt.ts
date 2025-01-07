import { isObject, isUndefined } from '@nestjs/common/utils/shared.utils';
import {
  MQTT_DEFAULT_URL,
  MQTT_SEPARATOR,
  MQTT_WILDCARD_ALL,
  MQTT_WILDCARD_SINGLE,
  NO_MESSAGE_HANDLER,
} from '../constants';
import { MqttContext } from '../ctx-host/mqtt.context';
import { Transport } from '../enums';
import { MqttEvents, MqttEventsMap, MqttStatus } from '../events/mqtt.events';
import {
  IncomingRequest,
  MessageHandler,
  PacketId,
  ReadPacket,
} from '../interfaces';
import { MqttOptions } from '../interfaces/microservice-configuration.interface';
import { MqttRecord } from '../record-builders/mqtt.record-builder';
import { MqttRecordSerializer } from '../serializers/mqtt-record.serializer';
import { Server } from './server';

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
export class ServerMqtt extends Server<MqttEvents, MqttStatus> {
  public readonly transportId = Transport.MQTT;
  protected readonly url: string;
  protected mqttClient: MqttClient;
  protected pendingEventListeners: Array<{
    event: keyof MqttEvents;
    callback: MqttEvents[keyof MqttEvents];
  }> = [];

  constructor(private readonly options: Required<MqttOptions>['options']) {
    super();
    this.url = this.getOptionsProp(options, 'url', MQTT_DEFAULT_URL);

    mqttPackage = this.loadPackage('mqtt', ServerMqtt.name, () =>
      require('mqtt'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    try {
      this.mqttClient = this.createMqttClient();
      this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public start(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    this.registerErrorListener(this.mqttClient);
    this.registerReconnectListener(this.mqttClient);
    this.registerDisconnectListener(this.mqttClient);
    this.registerCloseListener(this.mqttClient);
    this.registerConnectListener(this.mqttClient);

    this.pendingEventListeners.forEach(({ event, callback }) =>
      this.mqttClient.on(event, callback),
    );
    this.pendingEventListeners = [];
    this.bindEvents(this.mqttClient);

    this.mqttClient.on(MqttEventsMap.CONNECT, () => callback());
  }

  public bindEvents(mqttClient: MqttClient) {
    mqttClient.on('message', this.getMessageHandler(mqttClient).bind(this));

    const registeredPatterns = [...this.messageHandlers.keys()];
    registeredPatterns.forEach(pattern => {
      const { isEventHandler } = this.messageHandlers.get(pattern)!;
      mqttClient.subscribe(
        isEventHandler ? pattern : this.getRequestPattern(pattern),
        this.getOptionsProp(this.options, 'subscribeOptions'),
      );
    });
  }

  public close() {
    this.mqttClient && this.mqttClient.end();
    this.pendingEventListeners = [];
  }

  public createMqttClient(): MqttClient {
    return mqttPackage.connect(this.url, this.options as MqttOptions);
  }

  public getMessageHandler(pub: MqttClient) {
    return async (
      channel: string,
      buffer: Buffer,
      originalPacket?: Record<string, any>,
    ) => this.handleMessage(channel, buffer, pub, originalPacket);
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
    const publish = this.getPublisher(
      pub,
      channel,
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
    const response$ = this.transformToObservable(
      await handler(packet.data, mqttContext),
    );
    response$ && this.send(response$, publish);
  }

  public getPublisher(client: MqttClient, pattern: any, id: string): any {
    return (response: any) => {
      Object.assign(response, { id });

      const options =
        isObject(response?.data) && response.data instanceof MqttRecord
          ? (response.data as MqttRecord)?.options
          : {};
      delete response?.data?.options;

      const outgoingResponse: string | Buffer =
        this.serializer.serialize(response);
      return client.publish(
        this.getReplyPattern(pattern),
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

      if (!currentTopic && !currentPattern) {
        continue;
      }
      if (!currentTopic && currentPattern !== MQTT_WILDCARD_ALL) {
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
    const route = this.getRouteFromPattern(pattern);
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

  public registerErrorListener(client: MqttClient) {
    client.on(MqttEventsMap.ERROR, (err: unknown) => this.logger.error(err));
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
