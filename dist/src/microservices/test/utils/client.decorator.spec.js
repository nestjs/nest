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
require("mocha");
const chai_1 = require("chai");
const constants_1 = require("../../constants");
const client_decorator_1 = require("./../../utils/client.decorator");
describe('@Client', () => {
    const pattern = { role: 'test' };
    class TestComponent {
    }
    __decorate([
        client_decorator_1.Client(pattern),
        __metadata("design:type", Object)
    ], TestComponent, "instance", void 0);
    it(`should enhance property with metadata`, () => {
        const isClient = Reflect.getOwnMetadata(constants_1.CLIENT_METADATA, TestComponent, 'instance');
        const config = Reflect.getOwnMetadata(constants_1.CLIENT_CONFIGURATION_METADATA, TestComponent, 'instance');
        chai_1.expect(isClient).to.be.true;
        chai_1.expect(config).to.be.eql(pattern);
    });
});
//# sourceMappingURL=client.decorator.spec.js.map