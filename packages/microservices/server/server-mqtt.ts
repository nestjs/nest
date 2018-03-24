import * as mqtt from 'mqtt';
import { Server } from './server';
import { NO_PATTERN_MESSAGE } from '../constants';
import {
  MicroserviceOptions,
  MqttOptions,
} from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy, PacketId } from './../interfaces';
import { Observable } from 'rxjs/Observable';
import { catchError } from 'rxjs/operators';
import { empty } from 'rxjs/observable/empty';
import { finalize } from 'rxjs/operators';
import {
  MQTT_DEFAULT_URL,
  CONNECT_EVENT,
  MESSAGE_EVENT,
  ERROR_EVENT,
} from './../constants';
import { ReadPacket } from '@nestjs/microservices';

let mqttPackage: any = {};

export class ServerMqtt extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private mqttClient: mqtt.MqttClient;

  constructor(private readonly options: MicroserviceOptions) {
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

  public bindEvents(mqttClient: mqtt.MqttClient) {
    mqttClient.on(MESSAGE_EVENT, this.getMessageHandler(mqttClient).bind(this));
    const registeredPatterns = Object.keys(this.messageHandlers);
    registeredPatterns.forEach(pattern =>
      mqttClient.subscribe(this.getAckQueueName(pattern)),
    );
  }

  public close() {
    this.mqttClient && this.mqttClient.end();
  }

  public createMqttClient(): mqtt.MqttClient {
    return mqttPackage.connect(this.url, this.options.options as MqttOptions);
  }

  public getMessageHandler(pub: mqtt.MqttClient): any {
    return async (channel, buffer) =>
      await this.handleMessage(channel, buffer, pub);
  }

  public async handleMessage(
    channel: string,
    buffer: Buffer,
    pub: mqtt.MqttClient,
  ): Promise<any> {
    const packet = this.deserialize(buffer.toString());
    const pattern = channel.replace(/_ack$/, '');
    const publish = this.getPublisher(pub, pattern, packet.id);
    const status = 'error';

    if (!this.messageHandlers[pattern]) {
      return publish({ id: packet.id, status, err: NO_PATTERN_MESSAGE });
    }
    const handler = this.messageHandlers[pattern];
    const response$ = this.transformToObservable(
      await handler(packet.data),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public getPublisher(client: mqtt.MqttClient, pattern: any, id: string): any {
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
