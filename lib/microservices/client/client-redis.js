"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const client_proxy_1 = require("./client-proxy");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./../constants");
class ClientRedis extends client_proxy_1.ClientProxy {
    constructor(metadata) {
        super();
        this.metadata = metadata;
        this.logger = new logger_service_1.Logger(client_proxy_1.ClientProxy.name);
        this.isExplicitlyTerminated = false;
        this.url = metadata.url || constants_1.REDIS_DEFAULT_URL;
    }
    sendMessage(msg, callback) {
        if (!this.pubClient || !this.subClient) {
            this.init(callback);
        }
        const pattern = JSON.stringify(msg.pattern);
        const responseCallback = (channel, message) => {
            const { err, response, disposed } = JSON.parse(message);
            if (disposed) {
                callback(null, null, true);
                this.subClient.unsubscribe(this.getResPatternName(pattern));
                this.subClient.removeListener(constants_1.MESSAGE_EVENT, responseCallback);
                return;
            }
            callback(err, response);
        };
        this.subClient.on(constants_1.MESSAGE_EVENT, responseCallback);
        this.subClient.subscribe(this.getResPatternName(pattern));
        this.pubClient.publish(this.getAckPatternName(pattern), JSON.stringify(msg));
        return responseCallback;
    }
    getAckPatternName(pattern) {
        return `${pattern}_ack`;
    }
    getResPatternName(pattern) {
        return `${pattern}_res`;
    }
    close() {
        this.pubClient && this.pubClient.quit();
        this.subClient && this.subClient.quit();
        this.pubClient = this.subClient = null;
    }
    init(callback) {
        this.pubClient = this.createClient();
        this.subClient = this.createClient();
        this.handleError(this.pubClient, callback);
        this.handleError(this.subClient, callback);
    }
    createClient() {
        return redis.createClient(Object.assign({}, this.getClientOptions(), { url: this.url }));
    }
    handleError(client, callback) {
        const errorCallback = err => {
            if (err.code === 'ECONNREFUSED') {
                callback(err, null);
                this.pubClient = this.subClient = null;
            }
            this.logger.error(err);
        };
        client.addListener(constants_1.ERROR_EVENT, errorCallback);
        client.on(constants_1.CONNECT_EVENT, () => {
            client.removeListener(constants_1.ERROR_EVENT, errorCallback);
            client.addListener(constants_1.ERROR_EVENT, err => this.logger.error(err));
        });
    }
    getClientOptions() {
        const retry_strategy = options => this.createRetryStrategy(options);
        return {
            retry_strategy,
        };
    }
    createRetryStrategy(options) {
        if (this.isExplicitlyTerminated ||
            !this.metadata.retryAttempts ||
            options.attempt > this.metadata.retryAttempts) {
            return undefined;
        }
        return this.metadata.retryDelay || 0;
    }
}
exports.ClientRedis = ClientRedis;
