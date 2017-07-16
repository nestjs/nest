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
const controller_decorator_1 = require("../../utils/decorators/controller.decorator");
describe('@Controller', () => {
    const props = {
        path: 'test',
    };
    let Test = class Test {
    };
    Test = __decorate([
        controller_decorator_1.Controller(props)
    ], Test);
    let EmptyDecorator = class EmptyDecorator {
    };
    EmptyDecorator = __decorate([
        controller_decorator_1.Controller()
    ], EmptyDecorator);
    let AnotherTest = class AnotherTest {
    };
    AnotherTest = __decorate([
        controller_decorator_1.Controller({})
    ], AnotherTest);
    it('should enhance controller with expected path metadata', () => {
        const path = Reflect.getMetadata('path', Test);
        chai_1.expect(path).to.be.eql(props.path);
    });
    it('should set default path when no object passed as param', () => {
        const path = Reflect.getMetadata('path', EmptyDecorator);
        chai_1.expect(path).to.be.eql('/');
    });
    it('should set default path when empty passed as param', () => {
        const path = Reflect.getMetadata('path', AnotherTest);
        chai_1.expect(path).to.be.eql('/');
    });
});
//# sourceMappingURL=controller.decorator.spec.js.map