import { Logger } from '@nestjs/common/services/logger.service';
import { Client } from '../external/nats-client.interface';
import { PacketId, ReadPacket, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
export declare class ClientNats extends ClientProxy {
    protected readonly options: ClientOptions['options'];
    protected readonly logger: Logger;
    protected readonly url: string;
    protected natsClient: Client;
    protected connection: Promise<any>;
    constructor(options: ClientOptions['options']);
    close(): void;
    connect(): Promise<any>;
    createClient(): Client;
    handleError(client: Client): void;
    createSubscriptionHandler(packet: ReadPacket & PacketId, callback: (packet: WritePacket) => any): Function;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Function;
}
