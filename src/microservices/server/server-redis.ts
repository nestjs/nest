import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/finally';

import * as redis from 'redis';

import { CustomTransportStrategy } from './../interfaces';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';
import { NO_PATTERN_MESSAGE } from '../constants';
import { Observable } from 'rxjs/Observable';
import { Server } from './server';

const DEFAULT_URL = 'redis://localhost:6379';
const CONNECT_EVENT = 'connect';
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';

export class ServerRedis extends Server implements CustomTransportStrategy {
    private readonly url: string;
    private sub: redis.RedisClient = null;
    private pub: redis.RedisClient = null;

    constructor(config: MicroserviceConfiguration) {
        super();
        this.url = config.url || DEFAULT_URL;
    }

    public listen(callback: () => void) {
        this.sub = this.createRedisClient();
        this.pub = this.createRedisClient();

        this.handleErrors(this.pub);
        this.handleErrors(this.sub);
        this.start(callback);
    }

    public start(callback?: () => void) {
        this.sub.on(CONNECT_EVENT, () => this.handleConnection(callback, this.sub, this.pub));
    }

    public close() {
        this.pub && this.pub.quit();
        this.sub && this.sub.quit();
    }

    public createRedisClient() {
        return redis.createClient({ url: this.url });
    }

    public handleConnection(callback: Function, sub: redis.RedisClient, pub: redis.RedisClient) {
        sub.on(MESSAGE_EVENT, this.getMessageHandler(pub).bind(this));

        const patterns = Object.keys(this.messageHandlers);
        patterns.forEach((pattern) => sub.subscribe(this.getAckQueueName(pattern)));
        callback && callback();
    }

    public getMessageHandler(pub: redis.RedisClient) {
        return async (channel: any, buffer: any) => await this.handleMessage(channel, buffer, pub);
    }

    public async handleMessage(channel: any, buffer: any, pub: redis.RedisClient) {
        const msg = this.tryParse(buffer);
        const pattern = channel.replace(/_ack$/, '');
        const publish = this.getPublisher(pub, pattern);
        const status = 'error';

        if (!this.messageHandlers[pattern]) {
            publish({ status, error: NO_PATTERN_MESSAGE });
            return;
        }
        const handler = this.messageHandlers[pattern];
        const response$ = this.transformToObservable(await handler(msg.data)) as Observable<any>;
        response$ && this.send(response$, publish);
    }

    public getPublisher(pub: redis.RedisClient, pattern: string) {
        return (respond: object) => {
            pub.publish(
                this.getResQueueName(pattern),
                JSON.stringify(respond),
            );
        };
    }

    public tryParse(content: string) {
        try {
            return JSON.parse(content);
        }
        catch (e) {
            return content;
        }
    }

    public getAckQueueName(pattern: string) {
        return `${pattern}_ack`;
    }

    public getResQueueName(pattern: string): string {
        return `${pattern}_res`;
    }

    public handleErrors(stream: redis.RedisClient) {
        stream.on(ERROR_EVENT, (err: string) => this.logger.error(err));
    }
}
