import * as redis from 'redis';
import { Server } from './server';
import { NO_PATTERN_MESSAGE } from '../constants';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';

export class ServerRedis extends Server {
    private readonly url: string;
    private readonly DEFAULT_URL = 'redis://localhost:6379';

    constructor(config: MicroserviceConfiguration) {
        super();
        this.url = config.url || this.DEFAULT_URL;
    }

    listen(callback?: () => void) {
        const sub = this.createRedisClient();
        const pub = this.createRedisClient();

        sub.on('connect', () => this.handleConnection(callback, sub, pub));
    }

    createRedisClient() {
        return redis.createClient({ url: this.url });
    }

    handleConnection(callback, sub, pub) {
        sub.on('message', this.getMessageHandler(pub).bind(this));

        const patterns = Object.keys(this.msgHandlers);
        patterns.forEach((pattern) => sub.subscribe(this.getAckQueueName(pattern)));
        callback && callback();
    }

    getMessageHandler(pub) {
        return (channel, buffer) => this.handleMessage(channel, buffer, pub);
    }

    handleMessage(channel, buffer, pub) {
        const msg = this.tryParse(buffer);
        const pattern = channel.replace(/_ack$/, '');
        const publish = this.getPublisher(pub, pattern);

        if (!this.msgHandlers[pattern]) {
            publish({ err: NO_PATTERN_MESSAGE });
            return;
        }
        const handler = this.msgHandlers[pattern];
        handler(msg.data, this.getMessageHandlerCallback(pub, pattern).bind(this));
    }

    getMessageHandlerCallback(pub, pattern) {
        return (err, response) => {
            const publish = this.getPublisher(pub, pattern);
            if (!response) {
                const respond = err;
                publish({ err: null, response: respond });
                return;
            }
            publish({ err, response });
        }
    }

    getPublisher(pub, pattern) {
        return (respond) => {
            pub.publish(
                this.getResQueueName(pattern),
                JSON.stringify(respond)
            );
        }
    }

    tryParse(content) {
        try {
            return JSON.parse(content);
        }
        catch(e) {
            return content;
        }
    }

    getAckQueueName(pattern) {
        return `${pattern}_ack`;
    }

    getResQueueName(pattern) {
        return `${pattern}_res`;
    }
}