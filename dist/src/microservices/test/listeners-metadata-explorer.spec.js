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
const listener_metadata_explorer_1 = require("../listener-metadata-explorer");
const pattern_decorator_1 = require("../utils/pattern.decorator");
const client_decorator_1 = require("../utils/client.decorator");
const transport_enum_1 = require("../enums/transport.enum");
const metadata_scanner_1 = require("../../core/metadata-scanner");
describe('ListenerMetadataExplorer', () => {
    const pattern = { pattern: 'test' };
    const secPattern = { role: '2', cmd: 'm' };
    const clientMetadata = {};
    const clientSecMetadata = { transport: transport_enum_1.Transport.REDIS };
    class Test {
        constructor() { }
        get testGet() { return 0; }
        set testSet(val) { }
        test() { }
        testSec() { }
        noPattern() { }
    }
    __decorate([
        client_decorator_1.Client(clientMetadata),
        __metadata("design:type", Object)
    ], Test.prototype, "client", void 0);
    __decorate([
        client_decorator_1.Client(clientSecMetadata),
        __metadata("design:type", Object)
    ], Test.prototype, "redisClient", void 0);
    __decorate([
        pattern_decorator_1.MessagePattern(pattern),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], Test.prototype, "test", null);
    __decorate([
        pattern_decorator_1.MessagePattern(secPattern),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], Test.prototype, "testSec", null);
    let scanner;
    let instance;
    beforeEach(() => {
        scanner = new metadata_scanner_1.MetadataScanner();
        instance = new listener_metadata_explorer_1.ListenerMetadataExplorer(scanner);
    });
    describe('explore', () => {
        let scanFromPrototype;
        beforeEach(() => {
            scanFromPrototype = sinon.spy(scanner, 'scanFromPrototype');
        });
        it(`should call "scanFromPrototype" with expected arguments`, () => {
            const obj = new Test();
            instance.explore(obj);
            const { args } = scanFromPrototype.getCall(0);
            chai_1.expect(args[0]).to.be.eql(obj);
            chai_1.expect(args[1]).to.be.eql(Object.getPrototypeOf(obj));
        });
    });
    describe('exploreMethodMetadata', () => {
        let test;
        beforeEach(() => {
            test = new Test();
        });
        it(`should return null when "isPattern" metadata is undefined`, () => {
            const metadata = instance.exploreMethodMetadata(test, Object.getPrototypeOf(test), 'noPattern');
            chai_1.expect(metadata).to.eq(null);
        });
        it(`should return pattern properties when "isPattern" metadata is not undefined`, () => {
            const metadata = instance.exploreMethodMetadata(test, Object.getPrototypeOf(test), 'test');
            chai_1.expect(metadata).to.have.keys(['targetCallback', 'pattern']);
            chai_1.expect(metadata.pattern).to.eql(pattern);
        });
    });
    describe('scanForClientHooks', () => {
        it(`should returns properties with @Client decorator`, () => {
            const obj = new Test();
            const hooks = [...instance.scanForClientHooks(obj)];
            chai_1.expect(hooks).to.have.length(2);
            chai_1.expect(hooks[0]).to.deep.eq({ property: 'client', metadata: clientMetadata });
            chai_1.expect(hooks[1]).to.deep.eq({ property: 'redisClient', metadata: clientSecMetadata });
        });
    });
});
//# sourceMappingURL=listeners-metadata-explorer.spec.js.map