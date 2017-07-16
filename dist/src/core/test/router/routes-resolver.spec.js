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
const sinon = require("sinon");
const chai_1 = require("chai");
const routes_resolver_1 = require("../../router/routes-resolver");
const controller_decorator_1 = require("../../../common/utils/decorators/controller.decorator");
const request_mapping_decorator_1 = require("../../../common/utils/decorators/request-mapping.decorator");
const request_method_enum_1 = require("../../../common/enums/request-method.enum");
const application_config_1 = require("../../application-config");
describe('RoutesResolver', () => {
    let TestRoute = class TestRoute {
        getTest() { }
        anotherTest() { }
    };
    __decorate([
        request_mapping_decorator_1.RequestMapping({ path: 'test' }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TestRoute.prototype, "getTest", null);
    __decorate([
        request_mapping_decorator_1.RequestMapping({ path: 'another-test', method: request_method_enum_1.RequestMethod.POST }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TestRoute.prototype, "anotherTest", null);
    TestRoute = __decorate([
        controller_decorator_1.Controller({ path: 'global' })
    ], TestRoute);
    let router;
    let routesResolver;
    before(() => {
        router = {
            get() { },
            post() { },
        };
    });
    beforeEach(() => {
        routesResolver = new routes_resolver_1.RoutesResolver(null, {
            createRouter: () => router,
        }, new application_config_1.ApplicationConfig());
    });
    describe('setupRouters', () => {
        it('should method setup controllers to express application instance', () => {
            const routes = new Map();
            routes.set('TestRoute', {
                instance: new TestRoute(),
                metatype: TestRoute,
            });
            const use = sinon.spy();
            const applicationMock = { use };
            routesResolver.setupRouters(routes, '', applicationMock);
            chai_1.expect(use.calledOnce).to.be.true;
            chai_1.expect(use.calledWith('/global', router)).to.be.true;
        });
    });
});
//# sourceMappingURL=routes-resolver.spec.js.map