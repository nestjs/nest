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
const request_method_enum_1 = require("../../enums/request-method.enum");
const index_1 = require("../../index");
describe('@Get', () => {
    const requestPath = 'test';
    const requestProps = {
        path: requestPath,
        method: request_method_enum_1.RequestMethod.GET,
    };
    it('should enhance class with expected request metadata', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.Get(requestPath),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        const method = Reflect.getMetadata('method', Test.test);
        chai_1.expect(method).to.be.eql(requestProps.method);
        chai_1.expect(path).to.be.eql(requestPath);
    });
    it('should set path on "/" by default', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.Get(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        chai_1.expect(path).to.be.eql('/');
    });
});
describe('@Post', () => {
    const requestPath = 'test';
    const requestProps = {
        path: requestPath,
        method: request_method_enum_1.RequestMethod.POST,
    };
    it('should enhance class with expected request metadata', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.Post(requestPath),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        const method = Reflect.getMetadata('method', Test.test);
        chai_1.expect(method).to.be.eql(requestProps.method);
        chai_1.expect(path).to.be.eql(requestPath);
    });
    it('should set path on "/" by default', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.Post(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        chai_1.expect(path).to.be.eql('/');
    });
});
describe('@Delete', () => {
    const requestPath = 'test';
    const requestProps = {
        path: requestPath,
        method: request_method_enum_1.RequestMethod.DELETE,
    };
    it('should enhance class with expected request metadata', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.Delete(requestPath),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        const method = Reflect.getMetadata('method', Test.test);
        chai_1.expect(method).to.be.eql(requestProps.method);
        chai_1.expect(path).to.be.eql(requestPath);
    });
    it('should set path on "/" by default', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.Delete(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        chai_1.expect(path).to.be.eql('/');
    });
});
describe('@All', () => {
    const requestPath = 'test';
    const requestProps = {
        path: requestPath,
        method: request_method_enum_1.RequestMethod.ALL,
    };
    it('should enhance class with expected request metadata', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.All(requestPath),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        const method = Reflect.getMetadata('method', Test.test);
        chai_1.expect(method).to.be.eql(requestProps.method);
        chai_1.expect(path).to.be.eql(requestPath);
    });
    it('should set path on "/" by default', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.All(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        chai_1.expect(path).to.be.eql('/');
    });
});
describe('@Put', () => {
    const requestPath = 'test';
    const requestProps = {
        path: requestPath,
        method: request_method_enum_1.RequestMethod.PUT,
    };
    it('should enhance class with expected request metadata', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.Put(requestPath),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        const method = Reflect.getMetadata('method', Test.test);
        chai_1.expect(method).to.be.eql(requestProps.method);
        chai_1.expect(path).to.be.eql(requestPath);
    });
    it('should set path on "/" by default', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.Put(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        chai_1.expect(path).to.be.eql('/');
    });
});
describe('@Patch', () => {
    const requestPath = 'test';
    const requestProps = {
        path: requestPath,
        method: request_method_enum_1.RequestMethod.PATCH,
    };
    it('should enhance class with expected request metadata', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.Patch(requestPath),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        const method = Reflect.getMetadata('method', Test.test);
        chai_1.expect(method).to.be.eql(requestProps.method);
        chai_1.expect(path).to.be.eql(requestPath);
    });
    it('should set path on "/" by default', () => {
        class Test {
            static test() { }
        }
        __decorate([
            index_1.Patch(),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", void 0)
        ], Test, "test", null);
        const path = Reflect.getMetadata('path', Test.test);
        chai_1.expect(path).to.be.eql('/');
    });
});
//# sourceMappingURL=route-params.decorator.spec.js.map