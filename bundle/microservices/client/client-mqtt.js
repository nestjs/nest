"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_proxy_1 = require("./client-proxy");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./../constants");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const constants_2 = require("./constants");
let mqttPackage = {};
class ClientMqtt extends client_proxy_1.ClientProxy {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new logger_service_1.Logger(client_proxy_1.ClientProxy.name);
        this.url =
            this.getOptionsProp(this.options, 'url') || constants_1.MQTT_DEFAULT_URL;
        mqttPackage = load_package_util_1.loadPackage('mqtt', ClientMqtt.name);
    }
    getAckPatternName(pattern) {
        return `${pattern}_ack`;
    }
    getResPatternName(pattern) {
        return `${pattern}_res`;
    }
    close() {
        this.mqttClient && this.mqttClient.end();
        this.mqttClient = null;
    }
    connect() {
        this.mqttClient = this.createClient();
        this.handleError(this.mqttClient);
        return this.connect$(this.mqttClient).toPromise();
    }
    createClient() {
        return mqttPackage.connect(this.url, this.options.options);
    }
    handleError(client) {
        client.addListener(constants_1.ERROR_EVENT, err => err.code !== constants_2.ECONNREFUSED && this.logger.error(err));
    }
    async publish(partialPacket, callback) {
        try {
            if (!this.mqttClient) {
                await this.connect();
            }
            const packet = this.assignPacketId(partialPacket);
            const pattern = JSON.stringify(partialPacket.pattern);
            const responseChannel = this.getResPatternName(pattern);
            const responseCallback = (channel, buffer) => {
                const { err, response, isDisposed, id } = JSON.parse(buffer.toString());
                if (id !== packet.id) {
                    return undefined;
                }
                if (isDisposed || err) {
                    callback({
                        err,
                        response: null,
                        isDisposed: true,
                    });
                    this.mqttClient.unsubscribe(channel);
                    this.mqttClient.removeListener(constants_1.MESSAGE_EVENT, responseCallback);
                    return;
                }
                callback({
                    err,
                    response,
                });
            };
            this.mqttClient.on(constants_1.MESSAGE_EVENT, responseCallback);
            this.mqttClient.subscribe(responseChannel);
            this.mqttClient.publish(this.getAckPatternName(pattern), JSON.stringify(packet));
            return responseCallback;
        }
        catch (err) {
            callback({ err });
        }
    }
}
exports.ClientMqtt = ClientMqtt;
