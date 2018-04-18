import * as stan from 'node-nats-streaming';
import { Server } from './server';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy, PacketId } from './../interfaces';
import { ReadPacket } from './../interfaces/packet.interface';
export declare class ServerStan extends Server implements CustomTransportStrategy {
    private readonly options;
    private readonly url;
    private consumer;
    private publisher;
    constructor(options: MicroserviceOptions);
    listen(callback: () => void): Promise<void>;
    start(callback?: () => void): void;
    bindEvents(consumer: stan.Stan, publisher: stan.Stan): void;
    close(): void;
    createStanClient(clientId: string): Promise<stan.Stan>;
    getMessageHandler(channel: string, pubClient: stan.Stan): (buffer: any) => Promise<string>;
    handleMessage(channel: string, message: ReadPacket & PacketId, pub: stan.Stan): Promise<string>;
    getPublisher(publisher: stan.Stan, pattern: any, id: string): (response: any) => string;
    getAckQueueName(pattern: string): string;
    getResQueueName(pattern: string, id: string): string;
    handleError(stream: any): void;
}
