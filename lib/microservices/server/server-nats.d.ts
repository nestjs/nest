import * as nats from 'nats';
import { Server } from './server';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy, PacketId } from './../interfaces';
import { ReadPacket } from './../interfaces/packet.interface';
export declare class ServerNats extends Server implements CustomTransportStrategy {
    private readonly options;
    private readonly url;
    private consumer;
    private publisher;
    constructor(options: MicroserviceOptions);
    listen(callback: () => void): void;
    start(callback?: () => void): void;
    bindEvents(consumer: nats.Client, publisher: nats.Client): void;
    close(): void;
    createNatsClient(): nats.Client;
    getMessageHandler(channel: string, pubClient: nats.Client): (buffer: any) => Promise<void>;
    handleMessage(channel: string, message: ReadPacket & PacketId, pub: nats.Client): Promise<void>;
    getPublisher(publisher: nats.Client, pattern: any, id: string): (response: any) => void;
    getAckQueueName(pattern: string): string;
    getResQueueName(pattern: string, id: string): string;
    handleError(stream: any): void;
}
