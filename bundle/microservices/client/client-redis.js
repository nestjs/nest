"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_proxy_1 = require("./client-proxy");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./../constants");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_2 = require("./constants");
let redisPackage = {};
class ClientRedis extends client_proxy_1.ClientProxy {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new logger_service_1.Logger(client_proxy_1.ClientProxy.name);
        this.isExplicitlyTerminated = false;
        this.url =
            this.getOptionsProp(options, 'url') || constants_1.REDIS_DEFAULT_URL;
        redisPackage = load_package_util_1.loadPackage('redis', ClientRedis.name);
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
    connect() {
        return new Promise((resolve, reject) => {
            const error$ = new rxjs_1.Subject();
            this.pubClient = this.createClient(error$);
            this.subClient = this.createClient(error$);
            this.handleError(this.pubClient);
            this.handleError(this.subClient);
            const pubConnect$ = rxjs_1.fromEvent(this.pubClient, constants_1.CONNECT_EVENT);
            const subClient$ = rxjs_1.fromEvent(this.subClient, constants_1.CONNECT_EVENT);
            rxjs_1.merge(error$, rxjs_1.zip(pubConnect$, subClient$))
                .pipe(operators_1.take(1))
                .subscribe(resolve, reject);
        });
    }
    createClient(error$) {
        return redisPackage.createClient(Object.assign({}, this.getClientOptions(error$), { url: this.url }));
    }
    handleError(client) {
        client.addListener(constants_1.ERROR_EVENT, err => this.logger.error(err));
    }
    getClientOptions(error$) {
        const retry_strategy = options => this.createRetryStrategy(options, error$);
        return {
            retry_strategy,
        };
    }
    createRetryStrategy(options, error$) {
        if (options.error && options.error.code === constants_2.ECONNREFUSED) {
            error$.error(options.error);
            return options.error;
        }
        if (this.isExplicitlyTerminated ||
            !this.getOptionsProp(this.options, 'retryAttempts') ||
            options.attempt >
                this.getOptionsProp(this.options, 'retryAttempts')) {
            return undefined;
        }
        return this.getOptionsProp(this.options, 'retryDelay') || 0;
    }
    async publish(partialPacket, callback) {
        try {
            if (!this.pubClient || !this.subClient) {
                await this.connect();
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
            await new Promise(resolve => {
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
        }
        catch (err) {
            callback({ err });
        }
    }
}
exports.ClientRedis = ClientRedis;
