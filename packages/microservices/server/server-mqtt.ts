import { Observable } from 'rxjs';
import {
  CONNECT_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
  MQTT_DEFAULT_URL,
  NO_PATTERN_MESSAGE,
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
    registeredPatterns.forEach(pattern =>
      mqttClient.subscribe(this.getAckQueueName(pattern)),
    );
  }

  public close() {
    this.mqttClient && this.mqttClient.end();
  }

  public createMqttClient(): MqttClient {
    return mqttPackage.connect(this.url, this.options as MqttOptions);
  }

  public getMessageHandler(pub: MqttClient): Function {
    return async (channel, buffer) => this.handleMessage(channel, buffer, pub);
  }

  public async handleMessage(
    channel: string,
    buffer: Buffer,
    pub: MqttClient,
  ): Promise<any> {
    const packet = this.deserialize(buffer.toString());
    const pattern = channel.replace(/_ack$/, '');
    const publish = this.getPublisher(pub, pattern, packet.id);
    const handler = this.getHandlerByPattern(pattern);

    if (!handler) {
      const status = 'error';
      return publish({ id: packet.id, status, err: NO_PATTERN_MESSAGE });
    }
    const response$ = this.transformToObservable(
      await handler(packet.data),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public getPublisher(client: MqttClient, pattern: any, id: string): any {
    return response =>
      client.publish(
        this.getResQueueName(pattern),
        JSON.stringify(Object.assign(response, { id })),
      );
  }

  public deserialize(content): ReadPacket & PacketId {
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

  public handleError(stream) {
    stream.on(ERROR_EVENT, err => this.logger.error(err));
  }
}
