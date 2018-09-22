"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_1 = require("../constants");
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
            return this.connection;
        }
        const error$ = new rxjs_1.Subject();
        this.pubClient = this.createClient(error$);
        this.subClient = this.createClient(error$);
        this.handleError(this.pubClient);
        this.handleError(this.subClient);
        const pubConnect$ = rxjs_1.fromEvent(this.pubClient, constants_1.CONNECT_EVENT);
        const subClient$ = rxjs_1.fromEvent(this.subClient, constants_1.CONNECT_EVENT);
        this.connection = rxjs_1.merge(error$, rxjs_1.zip(pubConnect$, subClient$))
            .pipe(operators_1.take(1), operators_1.tap(() => this.subClient.on(constants_1.MESSAGE_EVENT, this.createResponseCallback())), operators_1.share())
            .toPromise();
        return this.connection;
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
    createResponseCallback() {
        return (channel, buffer) => {
            const { err, response, isDisposed, id } = JSON.parse(buffer);
            const callback = this.routingMap.get(id);
            if (!callback) {
                return;
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
            const pattern = this.normalizePattern(partialPacket.pattern);
            const responseChannel = this.getResPatternName(pattern);
            this.routingMap.set(packet.id, callback);
            this.subClient.subscribe(responseChannel, err => {
                if (err) {
                    return;
                }
                this.pubClient.publish(this.getAckPatternName(pattern), JSON.stringify(packet));
            });
            return () => {
                this.subClient.unsubscribe(responseChannel);
                this.routingMap.delete(packet.id);
            };
        }
        catch (err) {
            callback({ err });
        }
    }
}
exports.ClientRedis = ClientRedis;
