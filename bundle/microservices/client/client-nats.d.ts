import * as nats from 'nats';
import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { WritePacket } from './../interfaces';
import { ReadPacket } from 'src/microservices';
export declare class ClientNats extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private publisher;
    private consumer;
    constructor(options: ClientOptions);
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Promise<void>;
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string, id: string): string;
    close(): void;
    init(callback: (...args) => any): Promise<void>;
    createClient(): Promise<nats.Client>;
    handleError(client: nats.Client, callback: (...args) => any): void;
}
