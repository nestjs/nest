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
require("reflect-metadata");
const chai_1 = require("chai");
const gateway_server_decorator_1 = require("../../utils/gateway-server.decorator");
const constants_1 = require("../../constants");
describe('@WebSocketServer', () => {
    class TestGateway {
    }
    __decorate([
        gateway_server_decorator_1.WebSocketServer(),
        __metadata("design:type", Object)
    ], TestGateway, "server", void 0);
    it('should decorate server property with expected metadata', () => {
        const isServer = Reflect.getOwnMetadata(constants_1.GATEWAY_SERVER_METADATA, TestGateway, 'server');
        chai_1.expect(isServer).to.be.eql(true);
    });
    it('should set property value to null by default', () => {
        chai_1.expect(TestGateway.server).to.be.eql(null);
    });
});
//# sourceMappingURL=gateway-server.decorator.spec.js.map