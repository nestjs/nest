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
const stan = require("node-nats-streaming");
const server_1 = require("./server");
const constants_1 = require("../constants");
const constants_2 = require("./../constants");
class ServerStan extends server_1.Server {
    constructor(options) {
        super();
        this.options = options;
        this.url = options.url || constants_1.STAN_DEFAULT_URL;
    }
    listen(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.consumer = yield this.createStanClient('consumer');
            this.publisher = yield this.createStanClient('producer');
            this.start(callback);
        });
    }
    start(callback) {
        this.bindEvents(this.consumer, this.publisher);
        callback();
    }
    bindEvents(consumer, publisher) {
        const registeredPatterns = Object.keys(this.messageHandlers);
        registeredPatterns.forEach(pattern => {
            const channel = this.getAckQueueName(pattern);
            // TODO: Add opts
            const subscription = consumer.subscribe(channel, 'default');
            subscription.on(constants_1.MESSAGE_EVENT, () => this.getMessageHandler(channel, publisher));
        });
    }
    close() {
        this.publisher && this.publisher.close();
        this.consumer && this.consumer.close();
        this.publisher = this.consumer = null;
    }
    createStanClient(clientId) {
        const client = stan.connect('clusterId', clientId, {
            url: this.url,
        });
        this.handleError(client);
        return new Promise(resolve => client.on(constants_2.CONNECT_EVENT, () => resolve(client)));
    }
    getMessageHandler(channel, pubClient) {
        return (buffer) => __awaiter(this, void 0, void 0, function* () { return yield this.handleMessage(channel, buffer, pubClient); });
    }
    handleMessage(channel, message, pub) {
        return __awaiter(this, void 0, void 0, function* () {
            const pattern = channel.replace(/_ack$/, '');
            const publish = this.getPublisher(pub, pattern, message.id);
            const status = 'error';
            if (!this.messageHandlers[pattern]) {
                return publish({ id: message.id, status, err: constants_1.NO_PATTERN_MESSAGE });
            }
            const handler = this.messageHandlers[pattern];
            const response$ = this.transformToObservable(yield handler(message.data));
            response$ && this.send(response$, publish);
        });
    }
    getPublisher(publisher, pattern, id) {
        return response => publisher.publish(this.getResQueueName(pattern, id), Object.assign(response, { id }));
    }
    getAckQueueName(pattern) {
        return `${pattern}_ack`;
    }
    getResQueueName(pattern, id) {
        return `${pattern}_${id}_res`;
    }
    handleError(stream) {
        stream.on(constants_2.ERROR_EVENT, err => this.logger.error(err));
    }
}
exports.ServerStan = ServerStan;
