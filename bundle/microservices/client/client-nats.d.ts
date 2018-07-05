import { Client } from '../external/nats-client.interface';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { PacketId, ReadPacket, WritePacket } from './../interfaces';
import { ClientProxy } from './client-proxy';
export declare class ClientNats extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private natsClient;
    constructor(options: ClientOptions);
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string): string;
    close(): void;
    connect(): Promise<any>;
    createClient(): Promise<Client>;
    handleError(client: Client): void;
    createSubscriptionHandler(packet: ReadPacket & PacketId, callback: (packet: WritePacket) => any): Function;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Function;
}
