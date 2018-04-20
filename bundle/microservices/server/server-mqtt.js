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
const server_1 = require("./server");
const constants_1 = require("../constants");
const constants_2 = require("./../constants");
let mqttPackage = {};
class ServerMqtt extends server_1.Server {
    constructor(options) {
        super();
        this.options = options;
        this.url =
            this.getOptionsProp(options, 'url') || constants_2.MQTT_DEFAULT_URL;
        mqttPackage = this.loadPackage('mqtt', ServerMqtt.name);
    }
    listen(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.mqttClient = this.createMqttClient();
            this.start(callback);
        });
    }
    start(callback) {
        this.handleError(this.mqttClient);
        this.bindEvents(this.mqttClient);
        this.mqttClient.on(constants_2.CONNECT_EVENT, callback);
    }
    bindEvents(mqttClient) {
        mqttClient.on(constants_2.MESSAGE_EVENT, this.getMessageHandler(mqttClient).bind(this));
        const registeredPatterns = Object.keys(this.messageHandlers);
        registeredPatterns.forEach(pattern => mqttClient.subscribe(this.getAckQueueName(pattern)));
    }
    close() {
        this.mqttClient && this.mqttClient.end();
    }
    createMqttClient() {
        return mqttPackage.connect(this.url, this.options.options);
    }
    getMessageHandler(pub) {
        return (channel, buffer) => __awaiter(this, void 0, void 0, function* () { return yield this.handleMessage(channel, buffer, pub); });
    }
    handleMessage(channel, buffer, pub) {
        return __awaiter(this, void 0, void 0, function* () {
            const packet = this.deserialize(buffer.toString());
            const pattern = channel.replace(/_ack$/, '');
            const publish = this.getPublisher(pub, pattern, packet.id);
            const status = 'error';
            if (!this.messageHandlers[pattern]) {
                return publish({ id: packet.id, status, err: constants_1.NO_PATTERN_MESSAGE });
            }
            const handler = this.messageHandlers[pattern];
            const response$ = this.transformToObservable(yield handler(packet.data));
            response$ && this.send(response$, publish);
        });
    }
    getPublisher(client, pattern, id) {
        return response => client.publish(this.getResQueueName(pattern), JSON.stringify(Object.assign(response, { id })));
    }
    deserialize(content) {
        try {
            return JSON.parse(content);
        }
        catch (e) {
            return content;
        }
    }
    getAckQueueName(pattern) {
        return `${pattern}_ack`;
    }
    getResQueueName(pattern) {
        return `${pattern}_res`;
    }
    handleError(stream) {
        stream.on(constants_2.ERROR_EVENT, err => this.logger.error(err));
    }
}
exports.ServerMqtt = ServerMqtt;
