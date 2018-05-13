import { Server } from './server';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy, PacketId } from './../interfaces';
import { ReadPacket } from '@nestjs/microservices';
import { RedisClient, ClientOpts, RetryStrategyOptions } from '../external/redis.interface';
export declare class ServerRedis extends Server implements CustomTransportStrategy {
    private readonly options;
    private readonly url;
    private subClient;
    private pubClient;
    private isExplicitlyTerminated;
    constructor(options: MicroserviceOptions);
    listen(callback: () => void): void;
    start(callback?: () => void): void;
    bindEvents(subClient: RedisClient, pubClient: RedisClient): void;
    close(): void;
    createRedisClient(): RedisClient;
    getMessageHandler(pub: RedisClient): (channel: any, buffer: any) => Promise<boolean>;
    handleMessage(channel: any, buffer: string | any, pub: RedisClient): Promise<boolean>;
    getPublisher(pub: RedisClient, pattern: any, id: string): (response: any) => boolean;
    deserialize(content: any): ReadPacket & PacketId;
    getAckQueueName(pattern: string): string;
    getResQueueName(pattern: string): string;
    handleError(stream: any): void;
    getClientOptions(): Partial<ClientOpts>;
    createRetryStrategy(options: RetryStrategyOptions): undefined | number | void;
}
