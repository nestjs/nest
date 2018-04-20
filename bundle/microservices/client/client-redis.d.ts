import { ClientOpts, RetryStrategyOptions, RedisClient } from 'redis';
import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { WritePacket, ReadPacket } from './../interfaces';
export declare class ClientRedis extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private pubClient;
    private subClient;
    private isExplicitlyTerminated;
    constructor(options: ClientOptions);
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Promise<(channel: string, buffer: string) => any>;
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string): string;
    close(): void;
    init(callback: (...args) => any): void;
    createClient(): RedisClient;
    handleError(client: RedisClient, callback: (...args) => any): void;
    getClientOptions(): Partial<ClientOpts>;
    createRetryStrategy(options: RetryStrategyOptions): undefined | number;
}
