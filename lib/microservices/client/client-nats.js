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
let natsPackage = {};
class ClientNats extends client_proxy_1.ClientProxy {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new logger_service_1.Logger(client_proxy_1.ClientProxy.name);
        this.url =
            this.getOptionsProp(this.options, 'url') || constants_1.NATS_DEFAULT_URL;
        natsPackage = this.loadPackage('nats', ClientNats.name);
    }
    publish(partialPacket, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.natsClient) {
                yield this.init(callback);
            }
            const packet = this.assignPacketId(partialPacket);
            const pattern = JSON.stringify(partialPacket.pattern);
            const responseChannel = this.getResPatternName(pattern);
            const subscriptionHandler = (message) => {
                if (message.id !== packet.id) {
                    return void 0;
                }
                const { err, response, isDisposed } = message;
                if (isDisposed || err) {
                    callback({
                        err,
                        response: null,
                        isDisposed: true,
                    });
                    return this.natsClient.unsubscribe(subscriptionId);
                }
                callback({
                    err,
                    response,
                });
            };
            const subscriptionId = this.natsClient.subscribe(responseChannel, subscriptionHandler);
            this.natsClient.publish(this.getAckPatternName(pattern), packet);
            return subscriptionHandler;
        });
    }
    getAckPatternName(pattern) {
        return `${pattern}_ack`;
    }
    getResPatternName(pattern) {
        return `${pattern}_res`;
    }
    close() {
        this.natsClient && this.natsClient.close();
        this.natsClient = null;
    }
    init(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.natsClient = yield this.createClient();
            this.handleError(this.natsClient, callback);
        });
    }
    createClient() {
        const options = this.options.options || {};
        const client = natsPackage.connect(Object.assign({}, options, { url: this.url, json: true }));
        return new Promise(resolve => client.on(constants_1.CONNECT_EVENT, resolve));
    }
    handleError(client, callback) {
        const errorCallback = err => {
            if (err.code === 'ECONNREFUSED') {
                callback(err, null);
                this.natsClient = null;
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
