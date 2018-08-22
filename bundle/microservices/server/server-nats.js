"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const server_1 = require("./server");
let natsPackage = {};
class ServerNats extends server_1.Server {
    constructor(options) {
        super();
        this.options = options;
        this.url =
            this.getOptionsProp(this.options, 'url') || constants_1.NATS_DEFAULT_URL;
        natsPackage = this.loadPackage('nats', ServerNats.name);
    }
    listen(callback) {
        this.natsClient = this.createNatsClient();
        this.handleError(this.natsClient);
        this.start(callback);
    }
    start(callback) {
        this.bindEvents(this.natsClient);
        this.natsClient.on(constants_1.CONNECT_EVENT, callback);
    }
    bindEvents(client) {
        const registeredPatterns = Object.keys(this.messageHandlers);
        registeredPatterns.forEach(channel => {
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
        return async (buffer, replyTo) => await this.handleMessage(channel, buffer, client, replyTo);
    }
    async handleMessage(channel, message, client, replyTo) {
        const publish = this.getPublisher(client, replyTo, message.id);
        const status = 'error';
        if (!this.messageHandlers[channel]) {
            return publish({ id: message.id, status, err: constants_1.NO_PATTERN_MESSAGE });
        }
        const handler = this.messageHandlers[channel];
        const response$ = this.transformToObservable(await handler(message.data));
        response$ && this.send(response$, publish);
    }
    getPublisher(publisher, replyTo, id) {
        return response => publisher.publish(replyTo, Object.assign(response, {
            id,
        }));
    }
    handleError(stream) {
        stream.on(constants_1.ERROR_EVENT, err => this.logger.error(err));
    }
}
exports.ServerNats = ServerNats;
