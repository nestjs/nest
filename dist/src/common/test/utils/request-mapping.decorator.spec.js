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
const request_mapping_decorator_1 = require("../../utils/decorators/request-mapping.decorator");
const request_method_enum_1 = require("../../enums/request-method.enum");
describe('@RequestMapping', () => {
    const requestProps = {
        path: 'test',
        method: request_method_enum_1.RequestMethod.ALL,
    };
    it('should enhance class with expected request metadata', () => {
        class Test {
            static test() { }
        }
        __decorate([
            request_mapping_decorator_1.RequestMapping(requestProps),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        const method = Reflect.getMetadata('method', Test.test);
        chai_1.expect(method).to.be.eql(requestProps.method);
        chai_1.expect(path).to.be.eql(requestProps.path);
    });
    it('should set request method on GET by default', () => {
        class Test {
            static test() { }
        }
        __decorate([
            request_mapping_decorator_1.RequestMapping({ path: '' }),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const method = Reflect.getMetadata('method', Test.test);
        chai_1.expect(method).to.be.eql(request_method_enum_1.RequestMethod.GET);
    });
    it('should set path on "/" by default', () => {
        class Test {
            static test() { }
        }
        __decorate([
            request_mapping_decorator_1.RequestMapping({}),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const method = Reflect.getMetadata('path', Test.test);
        chai_1.expect(method).to.be.eql('/');
    });
});
//# sourceMappingURL=request-mapping.decorator.spec.js.map