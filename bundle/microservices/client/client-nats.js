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
const nats = require("nats");
const client_proxy_1 = require("./client-proxy");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./../constants");
class ClientNats extends client_proxy_1.ClientProxy {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new logger_service_1.Logger(client_proxy_1.ClientProxy.name);
        this.url = options.url || constants_1.NATS_DEFAULT_URL;
    }
    publish(partialPacket, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.publisher || !this.consumer) {
                yield this.init(callback);
            }
            const packet = this.assignPacketId(partialPacket);
            const pattern = JSON.stringify(partialPacket.pattern);
            const responseChannel = this.getResPatternName(pattern, packet.id);
            const subscriptionId = this.consumer.subscribe(responseChannel, (message) => {
                const { err, response, isDisposed } = message;
                if (isDisposed || err) {
                    callback({
                        err,
                        response: null,
                        isDisposed: true,
                    });
                    return this.consumer.unsubscribe(subscriptionId);
                }
                callback({
                    err,
                    response,
                });
            });
            this.publisher.publish(this.getAckPatternName(pattern), packet);
        });
    }
    getAckPatternName(pattern) {
        return `${pattern}_ack`;
    }
    getResPatternName(pattern, id) {
        return `${pattern}_${id}_res`;
    }
    close() {
        this.publisher && this.publisher.close();
        this.consumer && this.consumer.close();
        this.publisher = this.consumer = null;
    }
    init(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.publisher = yield this.createClient();
            this.consumer = yield this.createClient();
            this.handleError(this.publisher, callback);
            this.handleError(this.consumer, callback);
        });
    }
    createClient() {
        const client = nats.connect({
            url: this.url,
            json: true,
            maxReconnectAttempts: this.options.retryAttempts,
            reconnectTimeWait: this.options.retryDelay,
        });
        return new Promise(resolve => client.on(constants_1.CONNECT_EVENT, resolve));
    }
    handleError(client, callback) {
        const errorCallback = err => {
            if (err.code === 'ECONNREFUSED') {
                callback(err, null);
                this.publisher = this.consumer = null;
            }
            this.logger.error(err);
        };
        client.addListener(constants_1.ERROR_EVENT, errorCallback);
        client.on(constants_1.CONNECT_EVENT, () => {
            client.removeListener(constants_1.ERROR_EVENT, errorCallback);
            client.addListener(constants_1.ERROR_EVENT, err => this.logger.error(err));
        });
    }
}
exports.ClientNats = ClientNats;
