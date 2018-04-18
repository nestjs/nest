import * as stan from 'node-nats-streaming';
import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { WritePacket } from './../interfaces';
import { ReadPacket } from 'src/microservices';
export declare class ClientStan extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private client;
    constructor(options: ClientOptions);
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Promise<void>;
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string, id: string): string;
    close(): void;
    init(callback: (...args) => any): void;
    createClient(): stan.Stan;
    handleError(client: stan.Stan, callback: (...args) => any): void;
}
