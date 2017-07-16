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
const component_decorator_1 = require("../../utils/decorators/component.decorator");
describe('@Component', () => {
    let TestComponent = class TestComponent {
        constructor(param, test) { }
    };
    TestComponent = __decorate([
        component_decorator_1.Component(),
        __metadata("design:paramtypes", [Number, String])
    ], TestComponent);
    it('should enhance component with "design:paramtypes" metadata', () => {
        const constructorParams = Reflect.getMetadata('design:paramtypes', TestComponent);
        chai_1.expect(constructorParams[0]).to.be.eql(Number);
        chai_1.expect(constructorParams[1]).to.be.eql(String);
    });
});
//# sourceMappingURL=component.decorator.spec.js.map