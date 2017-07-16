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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../src/index");
const controller_decorator_1 = require("../../../src/common/utils/decorators/controller.decorator");
const client_decorator_1 = require("../../../src/microservices/utils/client.decorator");
const request_mapping_decorator_1 = require("../../../src/common/utils/decorators/request-mapping.decorator");
const client_proxy_1 = require("../../../src/microservices/client/client-proxy");
const rxjs_1 = require("rxjs");
const transport_enum_1 = require("../../../src/microservices/enums/transport.enum");
const index_2 = require("../../../src/microservices/index");
require("rxjs/add/operator/catch");
const MicroserviceClient = { transport: transport_enum_1.Transport.TCP };
let ClientController = class ClientController {
    sendMessage(res) {
        const pattern = { command: 'add' };
        const data = [1, 2, 3, 4, 5];
        this.client.send(pattern, data)
            .catch((err) => rxjs_1.Observable.empty())
            .subscribe((result) => res.status(200).json({ result }));
    }
    add(data) {
        const numbers = data || [];
        return rxjs_1.Observable.of(numbers.reduce((a, b) => a + b));
    }
};
__decorate([
    client_decorator_1.Client(MicroserviceClient),
    __metadata("design:type", client_proxy_1.ClientProxy)
], ClientController.prototype, "client", void 0);
__decorate([
    request_mapping_decorator_1.Get('client'),
    __param(0, index_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ClientController.prototype, "sendMessage", null);
__decorate([
    index_2.MessagePattern({ command: 'add' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", rxjs_1.Observable)
], ClientController.prototype, "add", null);
ClientController = __decorate([
    controller_decorator_1.Controller()
], ClientController);
exports.ClientController = ClientController;
//# sourceMappingURL=client.controller.js.map