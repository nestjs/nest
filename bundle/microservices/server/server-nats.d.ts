import { Server } from './server';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy, PacketId } from './../interfaces';
import { ReadPacket } from './../interfaces/packet.interface';
import { Client } from '../external/nats-client.interface';
export declare class ServerNats extends Server implements CustomTransportStrategy {
    private readonly options;
    private readonly url;
    private natsClient;
    constructor(options: MicroserviceOptions);
    listen(callback: () => void): void;
    start(callback?: () => void): void;
    bindEvents(client: Client): void;
    close(): void;
    createNatsClient(): Client;
    getMessageHandler(channel: string, client: Client): (buffer: any) => Promise<void>;
    handleMessage(channel: string, message: ReadPacket & PacketId, client: Client): Promise<void>;
    getPublisher(publisher: Client, pattern: any, id: string): (response: any) => void;
    getAckQueueName(pattern: string): string;
    getResQueueName(pattern: string): string;
    handleError(stream: any): void;
}
