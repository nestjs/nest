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
const subscribe_message_decorator_1 = require("../../utils/subscribe-message.decorator");
describe('@SubscribeMessage', () => {
    class TestGateway {
        static fn() { }
    }
    __decorate([
        subscribe_message_decorator_1.SubscribeMessage({ value: 'filter' }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TestGateway, "fn", null);
    it('should decorate transport with expected metadata', () => {
        const isMessageMapping = Reflect.getMetadata('__isMessageMapping', TestGateway.fn);
        const message = Reflect.getMetadata('message', TestGateway.fn);
        chai_1.expect(isMessageMapping).to.be.true;
        chai_1.expect(message).to.be.eql('filter');
    });
});
//# sourceMappingURL=subscribe-message.decorator.spec.js.map