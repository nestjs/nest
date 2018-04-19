"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const server_1 = require("./server");
const constants_1 = require("../constants");
const constants_2 = require("./../constants");
class ServerRedis extends server_1.Server {
    constructor(options) {
        super();
        this.options = options;
        this.isExplicitlyTerminated = false;
        this.url = options.url || constants_2.REDIS_DEFAULT_URL;
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
        const registeredPatterns = Object.keys(this.messageHandlers);
        registeredPatterns.forEach(pattern => subClient.subscribe(this.getAckQueueName(pattern)));
    }
    close() {
        this.isExplicitlyTerminated = true;
        this.pubClient && this.pubClient.quit();
        this.subClient && this.subClient.quit();
    }
    createRedisClient() {
        return redis.createClient(Object.assign({}, this.getClientOptions(), { url: this.url }));
    }
    getMessageHandler(pub) {
        return (channel, buffer) => __awaiter(this, void 0, void 0, function* () { return yield this.handleMessage(channel, buffer, pub); });
    }
    handleMessage(channel, buffer, pub) {
        return __awaiter(this, void 0, void 0, function* () {
            const packet = this.serialize(buffer);
            const pattern = channel.replace(/_ack$/, '');
            const publish = this.getPublisher(pub, pattern, packet.id);
            const status = 'error';
            if (!this.messageHandlers[pattern]) {
                return publish({ id: packet.id, status, err: constants_1.NO_PATTERN_MESSAGE });
            }
            const handler = this.messageHandlers[pattern];
            const response$ = this.transformToObservable(yield handler(packet.data));
            response$ && this.send(response$, publish);
        });
    }
    getPublisher(pub, pattern, id) {
        return response => pub.publish(this.getResQueueName(pattern, id), JSON.stringify(Object.assign(response, { id })));
    }
    serialize(content) {
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
    getResQueueName(pattern, id) {
        return `${pattern}_${id}_res`;
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
        if (this.isExplicitlyTerminated ||
            !this.options.retryAttempts ||
            options.attempt > this.options.retryAttempts) {
            return undefined;
        }
        return this.options.retryDelay || 0;
    }
}
exports.ServerRedis = ServerRedis;
