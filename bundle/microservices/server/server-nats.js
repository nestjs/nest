"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const constants_2 = require("./../constants");
const server_1 = require("./server");
let natsPackage = {};
class ServerNats extends server_1.Server {
    constructor(options) {
        super();
        this.options = options;
        this.url =
            this.getOptionsProp(this.options, 'url') || constants_2.NATS_DEFAULT_URL;
        natsPackage = this.loadPackage('nats', ServerNats.name);
    }
    listen(callback) {
        this.natsClient = this.createNatsClient();
        this.handleError(this.natsClient);
        this.start(callback);
    }
    start(callback) {
        this.bindEvents(this.natsClient);
        this.natsClient.on(constants_2.CONNECT_EVENT, callback);
    }
    bindEvents(client) {
        const registeredPatterns = Object.keys(this.messageHandlers);
        registeredPatterns.forEach(pattern => {
            const channel = this.getAckQueueName(pattern);
            client.subscribe(channel, this.getMessageHandler(channel, client).bind(this));
        });
    }
    close() {
        this.natsClient && this.natsClient.close();
        this.natsClient = null;
    }
    createNatsClient() {
        const options = this.options.options || {};
        return natsPackage.connect(Object.assign({}, options, { url: this.url, json: true }));
    }
    getMessageHandler(channel, client) {
        return async (buffer) => await this.handleMessage(channel, buffer, client);
    }
    async handleMessage(channel, message, client) {
        const pattern = channel.replace(/_ack$/, '');
        const publish = this.getPublisher(client, pattern, message.id);
        const status = 'error';
        if (!this.messageHandlers[pattern]) {
            return publish({ id: message.id, status, err: constants_1.NO_PATTERN_MESSAGE });
        }
        const handler = this.messageHandlers[pattern];
        const response$ = this.transformToObservable(await handler(message.data));
        response$ && this.send(response$, publish);
    }
    getPublisher(publisher, pattern, id) {
        return response => publisher.publish(this.getResQueueName(pattern), Object.assign(response, {
            id,
        }));
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
exports.ServerNats = ServerNats;
