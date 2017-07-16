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
const catch_decorator_1 = require("../../utils/decorators/catch.decorator");
const constants_1 = require("../../constants");
describe('@Catch', () => {
    const exceptions = ['exception', 'exception2'];
    let Test = class Test {
    };
    Test = __decorate([
        catch_decorator_1.Catch(...exceptions)
    ], Test);
    it('should enhance class with expected exceptions array', () => {
        const metadata = Reflect.getMetadata(constants_1.FILTER_CATCH_EXCEPTIONS, Test);
        chai_1.expect(metadata).to.be.eql(exceptions);
    });
});
//# sourceMappingURL=catch.decorator.spec.js.map