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
require("reflect-metadata");
const chai_1 = require("chai");
const constants_1 = require("../../constants");
const index_1 = require("../../index");
describe('@Inject', () => {
    const opaqueToken = () => ({});
    let Test = class Test {
        constructor(param, param2, param3) { }
    };
    Test = __decorate([
        __param(0, index_1.Inject('test')),
        __param(1, index_1.Inject('test2')),
        __param(2, index_1.Inject(opaqueToken)),
        __metadata("design:paramtypes", [Object, Object, Object])
    ], Test);
    it('should enhance class with expected constructor params metadata', () => {
        const metadata = Reflect.getMetadata(constants_1.SELF_DECLARED_DEPS_METADATA, Test);
        const expectedMetadata = [
            { index: 2, param: opaqueToken.name },
            { index: 1, param: 'test2' },
            { index: 0, param: 'test' },
        ];
        chai_1.expect(metadata).to.be.eql(expectedMetadata);
    });
});
//# sourceMappingURL=inject.decorator.spec.js.map