"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const constants_2 = require("./../constants");
const server_1 = require("./server");
let redisPackage = {};
class ServerRedis extends server_1.Server {
    constructor(options) {
        super();
        this.options = options;
        this.isExplicitlyTerminated = false;
        this.url =
            this.getOptionsProp(this.options, 'url') ||
                constants_2.REDIS_DEFAULT_URL;
        redisPackage = this.loadPackage('redis', ServerRedis.name);
    }
    listen(callback) {
        this.subClient = this.createRedisClient();
        this.pubClient = this.createRedisClient();
        this.handleError(this.pubClient);
        this.handleError(this.subClient);
        this.start(callback);
    }
    start(callback) {
        this.bindEvents(this.subClient, this.pubClient);
        this.subClient.on(constants_2.CONNECT_EVENT, callback);
    }
    bindEvents(subClient, pubClient) {
        subClient.on(constants_2.MESSAGE_EVENT, this.getMessageHandler(pubClient).bind(this));
        const subscribePatterns = Object.keys(this.messageHandlers);
        subscribePatterns.forEach(pattern => subClient.subscribe(this.getAckQueueName(pattern)));
    }
    close() {
        this.isExplicitlyTerminated = true;
        this.pubClient && this.pubClient.quit();
        this.subClient && this.subClient.quit();
    }
    createRedisClient() {
        return redisPackage.createClient(Object.assign({}, this.getClientOptions(), { url: this.url }));
    }
    getMessageHandler(pub) {
        return async (channel, buffer) => await this.handleMessage(channel, buffer, pub);
    }
    async handleMessage(channel, buffer, pub) {
        const packet = this.deserialize(buffer);
        const pattern = channel.replace(/_ack$/, '');
        const publish = this.getPublisher(pub, pattern, packet.id);
        const status = 'error';
        if (!this.messageHandlers[pattern]) {
            return publish({ id: packet.id, status, err: constants_1.NO_PATTERN_MESSAGE });
        }
        const handler = this.messageHandlers[pattern];
        const response$ = this.transformToObservable(await handler(packet.data));
        response$ && this.send(response$, publish);
    }
    getPublisher(pub, pattern, id) {
        return response => pub.publish(this.getResQueueName(pattern), JSON.stringify(Object.assign(response, { id })));
    }
    deserialize(content) {
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
    handleError(stream) {
        stream.on(constants_2.ERROR_EVENT, err => this.logger.error(err));
    }
    getClientOptions() {
        const retry_strategy = options => this.createRetryStrategy(options);
        return {
            retry_strategy,
        };
    }
    createRetryStrategy(options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return this.logger.error(`Error ECONNREFUSED: ${this.url}`);
        }
        if (this.isExplicitlyTerminated ||
            !this.getOptionsProp(this.options, 'retryAttempts') ||
            options.attempt >
                this.getOptionsProp(this.options, 'retryAttempts')) {
            return undefined;
        }
        return this.getOptionsProp(this.options, 'retryDelay') || 0;
    }
}
exports.ServerRedis = ServerRedis;
