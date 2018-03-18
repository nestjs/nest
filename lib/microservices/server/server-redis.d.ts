import * as redis from 'redis';
import { Server } from './server';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy, PacketId } from './../interfaces';
import { ReadPacket } from '@nestjs/microservices';
export declare class ServerRedis extends Server implements CustomTransportStrategy {
    private readonly options;
    private readonly url;
    private subClient;
    private pubClient;
    private isExplicitlyTerminated;
    constructor(options: MicroserviceOptions);
    listen(callback: () => void): void;
    start(callback?: () => void): void;
    bindEvents(subClient: redis.RedisClient, pubClient: redis.RedisClient): void;
    close(): void;
    createRedisClient(): redis.RedisClient;
    getMessageHandler(pub: redis.RedisClient): (channel: any, buffer: any) => Promise<boolean>;
    handleMessage(channel: any, buffer: string | any, pub: redis.RedisClient): Promise<boolean>;
    getPublisher(pub: redis.RedisClient, pattern: any, id: string): (response: any) => boolean;
    serialize(content: any): ReadPacket & PacketId;
    getAckQueueName(pattern: string): string;
    getResQueueName(pattern: string, id: string): string;
    handleError(stream: any): void;
    getClientOptions(): Partial<redis.ClientOpts>;
    createRetryStrategy(options: redis.RetryStrategyOptions): undefined | number;
}
