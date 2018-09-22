"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const operators_1 = require("rxjs/operators");
const constants_1 = require("../constants");
const client_proxy_1 = require("./client-proxy");
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
    close() {
        this.natsClient && this.natsClient.close();
        this.natsClient = null;
        this.connection = null;
    }
    async connect() {
        if (this.natsClient) {
            return this.connection;
        }
        this.natsClient = this.createClient();
        this.handleError(this.natsClient);
        this.connection = await this.connect$(this.natsClient)
            .pipe(operators_1.share())
            .toPromise();
        return this.connection;
    }
    createClient() {
        const options = this.options || {};
        return natsPackage.connect(Object.assign({}, options, { url: this.url, json: true }));
    }
    handleError(client) {
        client.addListener(constants_1.ERROR_EVENT, err => err.code !== constants_2.CONN_ERR && this.logger.error(err));
    }
    createSubscriptionHandler(packet, callback) {
        return (message) => {
            if (message.id !== packet.id) {
                return undefined;
            }
            const { err, response, isDisposed } = message;
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
            const channel = this.normalizePattern(partialPacket.pattern);
            const subscriptionHandler = this.createSubscriptionHandler(packet, callback);
            const subscriptionId = this.natsClient.request(channel, packet, subscriptionHandler);
            return () => this.natsClient.unsubscribe(subscriptionId);
        }
        catch (err) {
            callback({ err });
        }
    }
}
exports.ClientNats = ClientNats;
