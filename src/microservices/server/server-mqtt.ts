import * as mqtt from 'mqtt';
import { Server } from './server';
import { NO_PATTERN_MESSAGE } from '../constants';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
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

export class ServerMqtt extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private subClient: mqtt.MqttClient;
  private pubClient: mqtt.MqttClient;

  constructor(private readonly options: MicroserviceOptions) {
    super();
    this.url = options.url || MQTT_DEFAULT_URL;
  }

  public async listen(callback: () => void) {
    this.subClient = await this.createMqttClient();
    this.pubClient = await this.createMqttClient();

    this.handleError(this.pubClient);
    this.handleError(this.subClient);
    this.start(callback);
  }

  public start(callback?: () => void) {
    this.bindEvents(this.subClient, this.pubClient);
    this.subClient.on(CONNECT_EVENT, callback);
  }

  public bindEvents(
    subClient: mqtt.MqttClient,
    pubClient: mqtt.MqttClient,
  ) {
    subClient.on(MESSAGE_EVENT, this.getMessageHandler(pubClient).bind(this));
    const registeredPatterns = Object.keys(this.messageHandlers);
    registeredPatterns.forEach(pattern =>
      subClient.subscribe(this.getAckQueueName(pattern)),
    );
  }

  public close() {
    this.pubClient && this.pubClient.end();
    this.subClient && this.subClient.end();
  }

  public createMqttClient(): Promise<mqtt.MqttClient> {
    const client = mqtt.connect(this.url, {
      reconnectPeriod: this.options.retryDelay,
    });
    return new Promise(resolve =>
      client.on(CONNECT_EVENT, () => resolve(client)),
    );
  }

  public getMessageHandler(pub: mqtt.MqttClient): any {
    return async (channel, buffer) =>
      await this.handleMessage(channel, buffer, pub);
  }

  public async handleMessage(
    channel,
    buffer: string | any,
    pub: mqtt.MqttClient,
  ): Promise<any> {
    const packet = this.serialize(buffer);
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

  public getPublisher(pub: mqtt.MqttClient, pattern: any, id: string): any {
    return response =>
      pub.publish(
        this.getResQueueName(pattern, id),
        JSON.stringify(Object.assign(response, { id })),
      );
  }

  public serialize(content): ReadPacket & PacketId {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public getAckQueueName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResQueueName(pattern: string, id: string): string {
    return `${pattern}_${id}_res`;
  }

  public handleError(stream) {
    stream.on(ERROR_EVENT, err => this.logger.error(err));
  }
}
