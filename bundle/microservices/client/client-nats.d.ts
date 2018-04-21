import { Client } from 'nats';
import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { WritePacket, ReadPacket, PacketId } from './../interfaces';
export declare class ClientNats extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private natsClient;
    constructor(options: ClientOptions);
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Promise<(message: WritePacket<any> & PacketId) => void>;
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string): string;
    close(): void;
    init(callback: (...args) => any): Promise<void>;
    createClient(): Promise<Client>;
    handleError(client: Client, callback: (...args) => any): void;
}
