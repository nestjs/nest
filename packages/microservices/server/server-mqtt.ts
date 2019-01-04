import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import {
  CONNECT_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
  MQTT_DEFAULT_URL,
  NO_EVENT_HANDLER,
  NO_MESSAGE_HANDLER,
} from '../constants';
import { MqttClient } from '../external/mqtt-client.interface';
import { CustomTransportStrategy, PacketId, ReadPacket } from '../interfaces';
import {
  MicroserviceOptions,
  MqttOptions,
} from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

let mqttPackage: any = {};

export class ServerMqtt extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private mqttClient: MqttClient;

  constructor(private readonly options: MicroserviceOptions['options']) {
    super();
    this.url =
      this.getOptionsProp<MqttOptions>(options, 'url') || MQTT_DEFAULT_URL;

    mqttPackage = this.loadPackage('mqtt', ServerMqtt.name);
  }

  public async listen(callback: () => void) {
    this.mqttClient = this.createMqttClient();
    this.start(callback);
  }

  public start(callback?: () => void) {
    this.handleError(this.mqttClient);
    this.bindEvents(this.mqttClient);

    this.mqttClient.on(CONNECT_EVENT, callback);
  }

  public bindEvents(mqttClient: MqttClient) {
    mqttClient.on(MESSAGE_EVENT, this.getMessageHandler(mqttClient).bind(this));
    const registeredPatterns = [...this.messageHandlers.keys()];
    registeredPatterns.forEach(pattern => {
      const { isEventHandler } = this.messageHandlers.get(pattern);
      mqttClient.subscribe(
        isEventHandler ? pattern : this.getAckQueueName(pattern),
      );
    });
  }

  public close() {
    this.mqttClient && this.mqttClient.end();
  }

  public createMqttClient(): MqttClient {
    return mqttPackage.connect(
      this.url,
      this.options as MqttOptions,
    );
  }

  public getMessageHandler(pub: MqttClient): Function {
    return async (channel: string, buffer: Buffer) =>
      this.handleMessage(channel, buffer, pub);
  }

  public async handleMessage(
    channel: string,
    buffer: Buffer,
    pub: MqttClient,
  ): Promise<any> {
    const packet = this.deserialize(buffer.toString());
    if (isUndefined(packet.id)) {
      return this.handleEvent(channel, packet);
    }
    const pattern = channel.replace(/_ack$/, '');
    const publish = this.getPublisher(pub, pattern, packet.id);
    const handler = this.getHandlerByPattern(pattern);

    if (!handler) {
      const status = 'error';
      return publish({ id: packet.id, status, err: NO_MESSAGE_HANDLER });
    }
    const response$ = this.transformToObservable(
      await handler(packet.data),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public async handleEvent(pattern: string, packet: ReadPacket): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER);
    }
    await handler(packet.data);
  }

  public getPublisher(client: MqttClient, pattern: any, id: string): any {
    return (response: any) =>
      client.publish(
        this.getResQueueName(pattern),
        JSON.stringify(Object.assign(response, { id })),
      );
  }

  public deserialize(content: any): ReadPacket & PacketId {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public getAckQueueName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResQueueName(pattern: string): string {
    return `${pattern}_res`;
  }

  public handleError(stream: any) {
    stream.on(ERROR_EVENT, (err: any) => this.logger.error(err));
  }
}
