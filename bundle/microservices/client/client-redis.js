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
const client_proxy_1 = require("./client-proxy");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./../constants");
let redisPackage = {};
class ClientRedis extends client_proxy_1.ClientProxy {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new logger_service_1.Logger(client_proxy_1.ClientProxy.name);
        this.isExplicitlyTerminated = false;
        this.url =
            this.getOptionsProp(options, 'url') || constants_1.REDIS_DEFAULT_URL;
        redisPackage = this.loadPackage('redis', ClientRedis.name);
    }
    publish(partialPacket, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pubClient || !this.subClient) {
                this.init(callback);
            }
            const packet = this.assignPacketId(partialPacket);
            const pattern = JSON.stringify(partialPacket.pattern);
            const responseChannel = this.getResPatternName(pattern);
            const responseCallback = (channel, buffer) => {
                const { err, response, isDisposed, id } = JSON.parse(buffer);
                if (id !== packet.id) {
                    return undefined;
                }
                if (isDisposed || err) {
                    callback({
                        err,
                        response: null,
                        isDisposed: true,
                    });
                    this.subClient.unsubscribe(channel);
                    this.subClient.removeListener(constants_1.MESSAGE_EVENT, responseCallback);
                    return;
                }
                callback({
                    err,
                    response,
                });
            };
            this.subClient.on(constants_1.MESSAGE_EVENT, responseCallback);
            this.subClient.subscribe(responseChannel);
            yield new Promise(resolve => {
                const handler = channel => {
                    if (channel && channel !== responseChannel) {
                        return undefined;
                    }
                    this.subClient.removeListener(constants_1.SUBSCRIBE, handler);
                    resolve();
                };
                this.subClient.on(constants_1.SUBSCRIBE, handler);
            });
            this.pubClient.publish(this.getAckPatternName(pattern), JSON.stringify(packet));
            return responseCallback;
        });
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
        return redisPackage.createClient(Object.assign({}, this.getClientOptions(), { url: this.url }));
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
            !this.getOptionsProp(this.options, 'retryAttempts') ||
            options.attempt >
                this.getOptionsProp(this.options, 'retryAttempts')) {
            return undefined;
        }
        return this.getOptionsProp(this.options, 'retryDelay') || 0;
    }
}
exports.ClientRedis = ClientRedis;
