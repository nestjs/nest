"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_proxy_1 = require("./client-proxy");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./../constants");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const constants_2 = require("./constants");
let natsPackage = {};
class ClientNats extends client_proxy_1.ClientProxy {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new logger_service_1.Logger(client_proxy_1.ClientProxy.name);
        this.url =
            this.getOptionsProp(this.options, 'url') || constants_1.NATS_DEFAULT_URL;
        natsPackage = load_package_util_1.loadPackage('nats', ClientNats.name);
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
    async connect() {
        this.natsClient = await this.createClient();
        this.handleError(this.natsClient);
        return this.connect$(this.natsClient).toPromise();
    }
    createClient() {
        const options = this.options.options || {};
        return natsPackage.connect(Object.assign({}, options, { url: this.url, json: true }));
    }
    handleError(client) {
        client.addListener(constants_1.ERROR_EVENT, err => err.code !== constants_2.CONN_ERR && this.logger.error(err));
    }
    async publish(partialPacket, callback) {
        try {
            if (!this.natsClient) {
                await this.connect();
            }
            const packet = this.assignPacketId(partialPacket);
            const pattern = JSON.stringify(partialPacket.pattern);
            const responseChannel = this.getResPatternName(pattern);
            const subscriptionHandler = (message) => {
                if (message.id !== packet.id) {
                    return undefined;
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
        }
        catch (err) {
            callback({ err });
        }
    }
}
exports.ClientNats = ClientNats;
