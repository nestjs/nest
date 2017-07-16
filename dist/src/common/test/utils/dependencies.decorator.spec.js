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
const dependencies_decorator_1 = require("../../utils/decorators/dependencies.decorator");
const constants_1 = require("../../constants");
describe('@Dependencies', () => {
    const dep = 'test', dep2 = 'test2';
    const deps = [dep, dep2];
    let Test = class Test {
    };
    Test = __decorate([
        dependencies_decorator_1.Dependencies(deps)
    ], Test);
    let Test2 = class Test2 {
    };
    Test2 = __decorate([
        dependencies_decorator_1.Dependencies(dep, dep2)
    ], Test2);
    it('should enhance class with expected dependencies array', () => {
        const metadata = Reflect.getMetadata(constants_1.PARAMTYPES_METADATA, Test);
        chai_1.expect(metadata).to.be.eql(deps);
    });
    it('should makes passed array flatten', () => {
        const metadata = Reflect.getMetadata(constants_1.PARAMTYPES_METADATA, Test2);
        chai_1.expect(metadata).to.be.eql([dep, dep2]);
    });
});
//# sourceMappingURL=dependencies.decorator.spec.js.map