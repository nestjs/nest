import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { WritePacket, ReadPacket } from './../interfaces';
import { Client } from '../external/nats-client.interface';
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
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Promise<any>;
}
