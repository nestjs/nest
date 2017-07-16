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
const constants_1 = require("../../constants");
const exception_filters_decorator_1 = require("../../utils/decorators/exception-filters.decorator");
describe('@ExceptionFilters', () => {
    const filters = ['exception', 'exception2'];
    let Test = class Test {
    };
    Test = __decorate([
        exception_filters_decorator_1.ExceptionFilters(...filters)
    ], Test);
    class TestWithMethod {
        static test() { }
    }
    __decorate([
        exception_filters_decorator_1.ExceptionFilters(...filters),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TestWithMethod, "test", null);
    it('should enhance class with expected exception filters array', () => {
        const metadata = Reflect.getMetadata(constants_1.EXCEPTION_FILTERS_METADATA, Test);
        chai_1.expect(metadata).to.be.eql(filters);
    });
    it('should enhance method with expected exception filters array', () => {
        const metadata = Reflect.getMetadata(constants_1.EXCEPTION_FILTERS_METADATA, TestWithMethod.test);
        chai_1.expect(metadata).to.be.eql(filters);
    });
});
//# sourceMappingURL=exception-filters.decorator.spec.js.map