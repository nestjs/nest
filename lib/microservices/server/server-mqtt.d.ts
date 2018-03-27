/// <reference types="node" />
import { MqttClient } from 'mqtt';
import { Server } from './server';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy, PacketId } from './../interfaces';
import { ReadPacket } from '@nestjs/microservices';
export declare class ServerMqtt extends Server
  implements CustomTransportStrategy {
  private readonly options;
  private readonly url;
  private mqttClient;
  constructor(options: MicroserviceOptions);
  listen(callback: () => void): Promise<void>;
  start(callback?: () => void): void;
  bindEvents(mqttClient: MqttClient): void;
  close(): void;
  createMqttClient(): MqttClient;
  getMessageHandler(pub: MqttClient): any;
  handleMessage(channel: string, buffer: Buffer, pub: MqttClient): Promise<any>;
  getPublisher(client: MqttClient, pattern: any, id: string): any;
  deserialize(content: any): ReadPacket & PacketId;
  getAckQueueName(pattern: string): string;
  getResQueueName(pattern: string): string;
  handleError(stream: any): void;
}
