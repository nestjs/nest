import * as mqtt from 'mqtt';
import { Server } from './server';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy, PacketId } from './../interfaces';
import { ReadPacket } from '@nestjs/microservices';
export declare class ServerMqtt extends Server implements CustomTransportStrategy {
    private readonly options;
    private readonly url;
    private subClient;
    private pubClient;
    constructor(options: MicroserviceOptions);
    listen(callback: () => void): Promise<void>;
    start(callback?: () => void): void;
    bindEvents(subClient: mqtt.MqttClient, pubClient: mqtt.MqttClient): void;
    close(): void;
    createMqttClient(): Promise<mqtt.MqttClient>;
    getMessageHandler(pub: mqtt.MqttClient): any;
    handleMessage(channel: any, buffer: string | any, pub: mqtt.MqttClient): Promise<any>;
    getPublisher(pub: mqtt.MqttClient, pattern: any, id: string): any;
    serialize(content: any): ReadPacket & PacketId;
    getAckQueueName(pattern: string): string;
    getResQueueName(pattern: string, id: string): string;
    handleError(stream: any): void;
}
