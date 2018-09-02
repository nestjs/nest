import { Client } from '../external/nats-client.interface';
import { PacketId, ReadPacket, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
export declare class ClientNats extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private natsClient;
    constructor(options: ClientOptions['options']);
    close(): void;
    connect(): Promise<any>;
    createClient(): Promise<Client>;
    handleError(client: Client): void;
    createSubscriptionHandler(packet: ReadPacket & PacketId, callback: (packet: WritePacket) => any): Function;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Function;
}
