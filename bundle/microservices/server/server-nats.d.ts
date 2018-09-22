import { Client } from '../external/nats-client.interface';
import { CustomTransportStrategy, PacketId } from '../interfaces';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { ReadPacket } from '../interfaces/packet.interface';
import { Server } from './server';
export declare class ServerNats extends Server implements CustomTransportStrategy {
    private readonly options;
    private readonly url;
    private natsClient;
    constructor(options: MicroserviceOptions['options']);
    listen(callback: () => void): void;
    start(callback?: () => void): void;
    bindEvents(client: Client): void;
    close(): void;
    createNatsClient(): Client;
    getMessageHandler(channel: string, client: Client): (buffer: any, replyTo: string) => Promise<void>;
    handleMessage(channel: string, message: ReadPacket & PacketId, client: Client, replyTo: string): Promise<void>;
    getPublisher(publisher: Client, replyTo: string, id: string): (response: any) => void;
    handleError(stream: any): void;
}
