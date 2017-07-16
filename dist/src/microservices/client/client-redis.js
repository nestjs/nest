"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const client_proxy_1 = require("./client-proxy");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const DEFAULT_URL = 'redis://localhost:6379';
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';
class ClientRedis extends client_proxy_1.ClientProxy {
    constructor(metadata) {
        super();
        this.logger = new logger_service_1.Logger(client_proxy_1.ClientProxy.name);
        const { url } = metadata;
        this.url = url || DEFAULT_URL;
    }
    sendSingleMessage(msg, callback) {
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
    getAckPatternName(pattern) {
        return `${pattern}_ack`;
    }
    getResPatternName(pattern) {
        return `${pattern}_res`;
    }
    close() {
        this.pub && this.pub.quit();
        this.sub && this.sub.quit();
    }
    init() {
        this.pub = this.createClient();
        this.sub = this.createClient();
        this.handleErrors(this.pub);
        this.handleErrors(this.sub);
    }
    createClient() {
        return redis.createClient({ url: this.url });
    }
    handleErrors(stream) {
        stream.on(ERROR_EVENT, (err) => this.logger.error(err));
    }
}
exports.ClientRedis = ClientRedis;
//# sourceMappingURL=client-redis.js.map