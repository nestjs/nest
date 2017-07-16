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
const sinon = require("sinon");
const component_decorator_1 = require("../../../common/utils/decorators/component.decorator");
const builder_1 = require("../../middlewares/builder");
const middlewares_module_1 = require("../../middlewares/middlewares-module");
const invalid_middleware_exception_1 = require("../../errors/exceptions/invalid-middleware.exception");
const request_method_enum_1 = require("../../../common/enums/request-method.enum");
const controller_decorator_1 = require("../../../common/utils/decorators/controller.decorator");
const request_mapping_decorator_1 = require("../../../common/utils/decorators/request-mapping.decorator");
const runtime_exception_1 = require("../../errors/exceptions/runtime.exception");
const routes_mapper_1 = require("../../middlewares/routes-mapper");
const router_exception_filters_1 = require("../../router/router-exception-filters");
const application_config_1 = require("../../application-config");
describe('MiddlewaresModule', () => {
    let AnotherRoute = class AnotherRoute {
    };
    AnotherRoute = __decorate([
        controller_decorator_1.Controller({ path: 'test' })
    ], AnotherRoute);
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
    let TestMiddleware = class TestMiddleware {
        resolve() {
            return (req, res, next) => { };
        }
    };
    TestMiddleware = __decorate([
        component_decorator_1.Component()
    ], TestMiddleware);
    beforeEach(() => {
        middlewares_module_1.MiddlewaresModule.routerExceptionFilter = new router_exception_filters_1.RouterExceptionFilters(new application_config_1.ApplicationConfig());
    });
    describe('loadConfiguration', () => {
        it('should call "configure" method if method is implemented', () => {
            const configureSpy = sinon.spy();
            const mockModule = {
                configure: configureSpy,
            };
            middlewares_module_1.MiddlewaresModule.loadConfiguration(mockModule, 'Test');
            chai_1.expect(configureSpy.calledOnce).to.be.true;
            chai_1.expect(configureSpy.calledWith(new builder_1.MiddlewareBuilder(new routes_mapper_1.RoutesMapper()))).to.be.true;
        });
    });
    describe('setupRouteMiddleware', () => {
        it('should throw "RuntimeException" exception when middlewares is not stored in container', () => {
            const route = { path: 'Test' };
            const configuration = {
                middlewares: [TestMiddleware],
                forRoutes: [TestRoute]
            };
            const useSpy = sinon.spy();
            const app = { use: useSpy };
            chai_1.expect(middlewares_module_1.MiddlewaresModule.setupRouteMiddleware.bind(middlewares_module_1.MiddlewaresModule, route, configuration, 'Test', app)).throws(runtime_exception_1.RuntimeException);
        });
        it('should throw "InvalidMiddlewareException" exception when middlewares does not have "resolve" method', () => {
            let InvalidMiddleware = class InvalidMiddleware {
            };
            InvalidMiddleware = __decorate([
                component_decorator_1.Component()
            ], InvalidMiddleware);
            const route = { path: 'Test' };
            const configuration = {
                middlewares: [InvalidMiddleware],
                forRoutes: [TestRoute],
            };
            const useSpy = sinon.spy();
            const app = { use: useSpy };
            const container = middlewares_module_1.MiddlewaresModule.getContainer();
            const moduleKey = 'Test';
            container.addConfig([configuration], moduleKey);
            const instance = new InvalidMiddleware();
            container.getMiddlewares(moduleKey).set('InvalidMiddleware', {
                metatype: InvalidMiddleware,
                instance,
            });
            chai_1.expect(middlewares_module_1.MiddlewaresModule.setupRouteMiddleware.bind(middlewares_module_1.MiddlewaresModule, route, configuration, moduleKey, app)).throws(invalid_middleware_exception_1.InvalidMiddlewareException);
        });
        it('should store middlewares when middleware is stored in container', () => {
            const route = { path: 'Test', method: request_method_enum_1.RequestMethod.GET };
            const configuration = {
                middlewares: [TestMiddleware],
                forRoutes: [{ path: 'test' }, AnotherRoute, TestRoute],
            };
            const useSpy = sinon.spy();
            const app = {
                get: useSpy,
            };
            const container = middlewares_module_1.MiddlewaresModule.getContainer();
            const moduleKey = 'Test';
            container.addConfig([configuration], moduleKey);
            const instance = new TestMiddleware();
            container.getMiddlewares(moduleKey).set('TestMiddleware', {
                metatype: TestMiddleware,
                instance,
            });
            middlewares_module_1.MiddlewaresModule.setupRouteMiddleware(route, configuration, moduleKey, app);
            chai_1.expect(useSpy.calledOnce).to.be.true;
        });
    });
});
//# sourceMappingURL=middlewares-module.spec.js.map