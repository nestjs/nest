"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_1 = require("./../constants");
const client_proxy_1 = require("./client-proxy");
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
        if (this.pubClient && this.subClient) {
            return Promise.resolve();
        }
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
    createResponseCallback(packet, callback) {
        return (channel, buffer) => {
            const { err, response, isDisposed, id } = JSON.parse(buffer);
            if (id !== packet.id) {
                return undefined;
            }
            if (isDisposed || err) {
                return callback({
                    err,
                    response: null,
                    isDisposed: true,
                });
            }
            callback({
                err,
                response,
            });
        };
    }
    publish(partialPacket, callback) {
        try {
            const packet = this.assignPacketId(partialPacket);
            const pattern = JSON.stringify(partialPacket.pattern);
            const responseChannel = this.getResPatternName(pattern);
            const responseCallback = this.createResponseCallback(packet, callback);
            this.subClient.on(constants_1.MESSAGE_EVENT, responseCallback);
            this.subClient.subscribe(responseChannel);
            const handler = channel => {
                if (channel && channel !== responseChannel) {
                    return undefined;
                }
                this.subClient.removeListener(constants_1.SUBSCRIBE, handler);
            };
            this.subClient.on(constants_1.SUBSCRIBE, handler);
            this.pubClient.publish(this.getAckPatternName(pattern), JSON.stringify(packet));
            return () => {
                this.subClient.unsubscribe(responseChannel);
                this.subClient.removeListener(constants_1.MESSAGE_EVENT, responseCallback);
            };
        }
        catch (err) {
            callback({ err });
        }
    }
}
exports.ClientRedis = ClientRedis;
