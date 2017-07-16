"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_gateway_decorator_1 = require("../../../src/websockets/utils/socket-gateway.decorator");
const subscribe_message_decorator_1 = require("../../../src/websockets/utils/subscribe-message.decorator");
const gateway_server_decorator_1 = require("../../../src/websockets/utils/gateway-server.decorator");
const chat_middleware_1 = require("./chat.middleware");
let ChatGateway = class ChatGateway {
    afterInit(server) { }
    handleConnection(client) { }
    onMessage(client, data) {
        client.emit('event', data);
    }
};
__decorate([
    gateway_server_decorator_1.WebSocketServer(),
    __metadata("design:type", Object)
], ChatGateway.prototype, "server", void 0);
__decorate([
    subscribe_message_decorator_1.SubscribeMessage('event'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "onMessage", null);
ChatGateway = __decorate([
    socket_gateway_decorator_1.WebSocketGateway({
        port: 2000,
        middlewares: [chat_middleware_1.ChatMiddleware],
    })
], ChatGateway);
exports.ChatGateway = ChatGateway;
//# sourceMappingURL=chat.gateway.js.map