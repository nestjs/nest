import * as redis from 'redis';
import { ClientProxy } from './client-proxy';
import { Logger } from '@nestjs/common/services/logger.service';
import { ClientMetadata } from '../interfaces/client-metadata.interface';

const DEFAULT_URL = 'redis://localhost:6379';
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';

export class ClientRedis extends ClientProxy {
    private readonly logger = new Logger(ClientProxy.name);
    private readonly url: string;

    private pub: redis.RedisClient;
    private sub: redis.RedisClient;

    constructor(metadata: ClientMetadata) {
        super();

        const { url } = metadata;
        this.url = url || DEFAULT_URL;
    }

    public sendSingleMessage(msg, callback: (...args) => any) {
        if (!this.pub || !this.sub) {
            this.init();
        }
        const pattern = JSON.stringify(msg.pattern);
        const responseCallback = (channel, message) => {
            const { err, response, disposed } = JSON.parse(message);
            if (disposed) {
                callback(null, null, true);
                this.sub.unsubscribe(this.getResPatternName(pattern));
                this.sub.removeListener(MESSAGE_EVENT, responseCallback);
                return;
            }
            callback(err, response);
        };

        this.sub.on(MESSAGE_EVENT, responseCallback);
        this.sub.subscribe(this.getResPatternName(pattern));
        this.pub.publish(this.getAckPatternName(pattern), JSON.stringify(msg));
        return responseCallback;
    }

    public getAckPatternName(pattern: string): string {
        return `${pattern}_ack`;
    }

    public getResPatternName(pattern: string): string {
        return `${pattern}_res`;
    }

    public close() {
        this.pub && this.pub.quit();
        this.sub && this.sub.quit();
    }

    public init() {
        this.pub = this.createClient();
        this.sub = this.createClient();

        this.handleErrors(this.pub);
        this.handleErrors(this.sub);
    }

    public createClient(): redis.RedisClient {
        return redis.createClient({ url: this.url });
    }

    public handleErrors(stream) {
        stream.on(ERROR_EVENT, (err) => this.logger.error(err));
    }
}