"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const chai_1 = require("chai");
const socket_gateway_decorator_1 = require("../../utils/socket-gateway.decorator");
describe('@WebSocketGateway', () => {
    let TestGateway = class TestGateway {
    };
    TestGateway = __decorate([
        socket_gateway_decorator_1.WebSocketGateway({ port: 80, namespace: '/' })
    ], TestGateway);
    it('should decorate transport with expected metadata', () => {
        const isGateway = Reflect.getMetadata('__isGateway', TestGateway);
        const port = Reflect.getMetadata('port', TestGateway);
        const namespace = Reflect.getMetadata('namespace', TestGateway);
        chai_1.expect(isGateway).to.be.eql(true);
        chai_1.expect(port).to.be.eql(80);
        chai_1.expect(namespace).to.be.eql('/');
    });
});
//# sourceMappingURL=socket-gateway.decorator.spec.js.map