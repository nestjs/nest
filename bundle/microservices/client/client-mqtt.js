"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_proxy_1 = require("./client-proxy");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./../constants");
let mqttPackage = {};
class ClientMqtt extends client_proxy_1.ClientProxy {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new logger_service_1.Logger(client_proxy_1.ClientProxy.name);
        this.url =
            this.getOptionsProp(this.options, 'url') || constants_1.MQTT_DEFAULT_URL;
        mqttPackage = this.loadPackage('mqtt', ClientMqtt.name);
    }
    publish(partialPacket, callback) {
        if (!this.mqttClient) {
            this.init(callback);
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
    init(callback) {
        this.mqttClient = this.createClient();
        this.handleError(this.mqttClient, callback);
    }
    createClient() {
        return mqttPackage.connect(this.url, this.options.options);
    }
    handleError(client, callback) {
        const errorCallback = err => {
            if (err.code === 'ECONNREFUSED') {
                callback(err, null);
                this.mqttClient = null;
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
exports.ClientMqtt = ClientMqtt;
