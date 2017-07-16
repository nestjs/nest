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
const amqp = require("amqplib");
const index_1 = require("../../src/microservices/index");
class RabbitMQClient extends index_1.ClientProxy {
    constructor(host, queue) {
        super();
        this.host = host;
        this.queue = queue;
    }
    sendSingleMessage(msg, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const server = yield amqp.connect(this.host);
            const channel = yield server.createChannel();
            const sub = this.getSubscriberQueue();
            const pub = this.getPublisherQueue();
            channel.assertQueue(sub, { durable: false });
            channel.assertQueue(pub, { durable: false });
            channel.consume(pub, (message) => this.handleMessage(message, server, callback), { noAck: true });
            channel.sendToQueue(sub, Buffer.from(JSON.stringify(msg)));
        });
    }
    handleMessage(message, server, callback) {
        const { content } = message;
        const { err, response, disposed } = JSON.parse(content.toString());
        if (disposed) {
            server.close();
        }
        callback(err, response, disposed);
    }
    getPublisherQueue() {
        return `${this.queue}_pub`;
    }
    getSubscriberQueue() {
        return `${this.queue}_sub`;
    }
}
exports.RabbitMQClient = RabbitMQClient;
//# sourceMappingURL=rabbitmq-client.js.map