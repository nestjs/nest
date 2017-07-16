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
const chai_1 = require("chai");
const routes_mapper_1 = require("../../middlewares/routes-mapper");
const controller_decorator_1 = require("../../../common/utils/decorators/controller.decorator");
const request_mapping_decorator_1 = require("../../../common/utils/decorators/request-mapping.decorator");
const request_method_enum_1 = require("../../../common/enums/request-method.enum");
const unknown_request_mapping_exception_1 = require("../../errors/exceptions/unknown-request-mapping.exception");
describe('RoutesMapper', () => {
    let TestRoute = class TestRoute {
        getTest() { }
        getAnother() { }
    };
    __decorate([
        request_mapping_decorator_1.RequestMapping({ path: 'test' }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TestRoute.prototype, "getTest", null);
    __decorate([
        request_mapping_decorator_1.RequestMapping({ path: 'another', method: request_method_enum_1.RequestMethod.DELETE }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TestRoute.prototype, "getAnother", null);
    TestRoute = __decorate([
        controller_decorator_1.Controller({ path: 'test' })
    ], TestRoute);
    let mapper;
    beforeEach(() => {
        mapper = new routes_mapper_1.RoutesMapper();
    });
    it('should map @Controller() to "ControllerMetadata" in forRoutes', () => {
        const config = {
            middlewares: 'Test',
            forRoutes: [
                { path: 'test', method: request_method_enum_1.RequestMethod.GET },
                TestRoute,
            ],
        };
        chai_1.expect(mapper.mapRouteToRouteProps(config.forRoutes[0])).to.deep.equal([{
                path: '/test', method: request_method_enum_1.RequestMethod.GET,
            }]);
        chai_1.expect(mapper.mapRouteToRouteProps(config.forRoutes[1])).to.deep.equal([
            { path: '/test/test', method: request_method_enum_1.RequestMethod.GET },
            { path: '/test/another', method: request_method_enum_1.RequestMethod.DELETE },
        ]);
    });
    it('should throw exception when invalid object was passed as route', () => {
        const config = {
            middlewares: 'Test',
            forRoutes: [
                { method: request_method_enum_1.RequestMethod.GET },
            ],
        };
        chai_1.expect(mapper.mapRouteToRouteProps.bind(mapper, config.forRoutes[0])).throws(unknown_request_mapping_exception_1.UnknownRequestMappingException);
    });
});
//# sourceMappingURL=routes-mapper.spec.js.map