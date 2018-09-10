"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_1 = require("../constants");
const client_proxy_1 = require("./client-proxy");
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
        this.connection = null;
    }
    connect() {
        if (this.mqttClient) {
            return this.connection;
        }
        this.mqttClient = this.createClient();
        this.handleError(this.mqttClient);
        const connect$ = this.connect$(this.mqttClient);
        this.connection = this.mergeCloseEvent(this.mqttClient, connect$)
            .pipe(operators_1.tap(() => this.mqttClient.on(constants_1.MESSAGE_EVENT, this.createResponseCallback())), operators_1.share())
            .toPromise();
        return this.connection;
    }
    mergeCloseEvent(instance, source$) {
        const close$ = rxjs_1.fromEvent(instance, constants_1.CLOSE_EVENT).pipe(operators_1.map(err => {
            throw err;
        }));
        return rxjs_1.merge(source$, close$).pipe(operators_1.first());
    }
    createClient() {
        return mqttPackage.connect(this.url, this.options);
    }
    handleError(client) {
        client.addListener(constants_1.ERROR_EVENT, err => err.code !== constants_2.ECONNREFUSED && this.logger.error(err));
    }
    createResponseCallback() {
        return (channel, buffer) => {
            const { err, response, isDisposed, id } = JSON.parse(buffer.toString());
            const callback = this.routingMap.get(id);
            if (!callback) {
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
            const pattern = this.normalizePattern(partialPacket.pattern);
            const responseChannel = this.getResPatternName(pattern);
            this.mqttClient.subscribe(responseChannel, err => {
                if (err) {
                    return;
                }
                this.routingMap.set(packet.id, callback);
                this.mqttClient.publish(this.getAckPatternName(pattern), JSON.stringify(packet));
            });
            return () => {
                this.mqttClient.unsubscribe(responseChannel);
                this.routingMap.delete(packet.id);
            };
        }
        catch (err) {
            callback({ err });
        }
    }
}
exports.ClientMqtt = ClientMqtt;
