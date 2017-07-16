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
const sinon = require("sinon");
const chai_1 = require("chai");
const socket_gateway_decorator_1 = require("../utils/socket-gateway.decorator");
const gateway_server_decorator_1 = require("../utils/gateway-server.decorator");
const subscribe_message_decorator_1 = require("../utils/subscribe-message.decorator");
const gateway_metadata_explorer_1 = require("../gateway-metadata-explorer");
const metadata_scanner_1 = require("../../core/metadata-scanner");
describe('GatewayMetadataExplorer', () => {
    const message = 'test';
    const secMessage = 'test2';
    let Test = class Test {
        constructor() { }
        get testGet() { return 0; }
        set testSet(val) { }
        test() { }
        testSec() { }
        noMessage() { }
    };
    __decorate([
        gateway_server_decorator_1.WebSocketServer(),
        __metadata("design:type", Object)
    ], Test.prototype, "server", void 0);
    __decorate([
        gateway_server_decorator_1.WebSocketServer(),
        __metadata("design:type", Object)
    ], Test.prototype, "anotherServer", void 0);
    __decorate([
        subscribe_message_decorator_1.SubscribeMessage({ value: message }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], Test.prototype, "test", null);
    __decorate([
        subscribe_message_decorator_1.SubscribeMessage({ value: secMessage }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], Test.prototype, "testSec", null);
    Test = __decorate([
        socket_gateway_decorator_1.WebSocketGateway(),
        __metadata("design:paramtypes", [])
    ], Test);
    let instance;
    let scanner;
    beforeEach(() => {
        scanner = new metadata_scanner_1.MetadataScanner();
        instance = new gateway_metadata_explorer_1.GatewayMetadataExplorer(scanner);
    });
    describe('explore', () => {
        let scanFromPrototype;
        beforeEach(() => {
            scanFromPrototype = sinon.spy(scanner, 'scanFromPrototype');
        });
        it(`should call "scanFromPrototype" with expected arguments`, () => {
            const obj = new Test();
            instance.explore(obj);
            const [argObj, argProto] = scanFromPrototype.getCall(0).args;
            chai_1.expect(argObj).to.be.eql(obj);
            chai_1.expect(argProto).to.be.eql(Object.getPrototypeOf(obj));
        });
    });
    describe('exploreMethodMetadata', () => {
        let test;
        beforeEach(() => {
            test = new Test();
        });
        it(`should return null when "isMessageMapping" metadata is undefined`, () => {
            const metadata = instance.exploreMethodMetadata(test, Object.getPrototypeOf(test), 'noMessage');
            chai_1.expect(metadata).to.eq(null);
        });
        it(`should return message mapping properties when "isMessageMapping" metadata is not undefined`, () => {
            const metadata = instance.exploreMethodMetadata(test, Object.getPrototypeOf(test), 'test');
            chai_1.expect(metadata).to.have.keys(['callback', 'message']);
            chai_1.expect(metadata.message).to.eql(message);
        });
    });
    describe('scanForServerHooks', () => {
        it(`should returns properties with @Client decorator`, () => {
            const obj = new Test();
            const servers = [...instance.scanForServerHooks(obj)];
            chai_1.expect(servers).to.have.length(2);
            chai_1.expect(servers).to.deep.eq(['server', 'anotherServer']);
        });
    });
});
//# sourceMappingURL=gateway-metadata-explorer.spec.js.map