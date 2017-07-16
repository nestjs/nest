"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const server_1 = require("./server");
const constants_1 = require("../constants");
require("rxjs/add/operator/catch");
require("rxjs/add/observable/empty");
require("rxjs/add/operator/finally");
const DEFAULT_URL = 'redis://localhost:6379';
const CONNECT_EVENT = 'connect';
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';
class ServerRedis extends server_1.Server {
    constructor(config) {
        super();
        this.sub = null;
        this.pub = null;
        this.url = config.url || DEFAULT_URL;
    }
    listen(callback) {
        this.sub = this.createRedisClient();
        this.pub = this.createRedisClient();
        this.handleErrors(this.pub);
        this.handleErrors(this.sub);
        this.start(callback);
    }
    start(callback) {
        this.sub.on(CONNECT_EVENT, () => this.handleConnection(callback, this.sub, this.pub));
    }
    close() {
        this.pub && this.pub.quit();
        this.sub && this.sub.quit();
    }
    createRedisClient() {
        return redis.createClient({ url: this.url });
    }
    handleConnection(callback, sub, pub) {
        sub.on(MESSAGE_EVENT, this.getMessageHandler(pub).bind(this));
        const patterns = Object.keys(this.messageHandlers);
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
        if (!this.messageHandlers[pattern]) {
            publish({ err: constants_1.NO_PATTERN_MESSAGE });
            return;
        }
        const handler = this.messageHandlers[pattern];
        const response$ = handler(msg.data);
        response$ && this.send(response$, publish);
    }
    getPublisher(pub, pattern) {
        return (respond) => {
            pub.publish(this.getResQueueName(pattern), JSON.stringify(respond));
        };
    }
    tryParse(content) {
        try {
            return JSON.parse(content);
        }
        catch (e) {
            return content;
        }
    }
    getAckQueueName(pattern) {
        return `${pattern}_ack`;
    }
    getResQueueName(pattern) {
        return `${pattern}_res`;
    }
    handleErrors(stream) {
        stream.on(ERROR_EVENT, (err) => this.logger.error(err));
    }
}
exports.ServerRedis = ServerRedis;
//# sourceMappingURL=server-redis.js.map