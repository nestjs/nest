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
const microservices_1 = require("@nestjs/microservices");
class RabbitMQServer extends microservices_1.Server {
    constructor(host, queue) {
        super();
        this.host = host;
        this.queue = queue;
        this.server = null;
        this.channel = null;
    }
    listen(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            this.channel.consume(`${this.queue}_sub`, this.handleMessage.bind(this), { noAck: true });
        });
    }
    close() {
        this.channel && this.channel.close();
        this.server && this.server.close();
    }
    handleMessage(message) {
        const { content } = message;
        const msg = JSON.parse(content.toString());
        const handlers = this.getHandlers();
        const pattern = JSON.stringify(msg.pattern);
        if (!this.messageHandlers[pattern]) {
            return;
        }
        const handler = this.messageHandlers[pattern];
        const response$ = handler(msg.data);
        response$ && this.send(response$, (data) => this.sendMessage(data));
    }
    sendMessage(message) {
        this.channel.sendToQueue(`${this.queue}_pub`, Buffer.from(JSON.stringify(message)));
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.server = yield amqp.connect(this.host);
            this.channel = yield this.server.createChannel();
            this.channel.assertQueue(`${this.queue}_sub`, { durable: false });
            this.channel.assertQueue(`${this.queue}_pub`, { durable: false });
        });
    }
}
exports.RabbitMQServer = RabbitMQServer;
//# sourceMappingURL=rabbitmq-server.js.map