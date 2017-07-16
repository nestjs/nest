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
const router_explorer_1 = require("../../router/router-explorer");
const controller_decorator_1 = require("../../../common/utils/decorators/controller.decorator");
const request_mapping_decorator_1 = require("../../../common/utils/decorators/request-mapping.decorator");
const request_method_enum_1 = require("../../../common/enums/request-method.enum");
const metadata_scanner_1 = require("../../metadata-scanner");
describe('RouterExplorer', () => {
    let TestRoute = class TestRoute {
        getTest() { }
        postTest() { }
        anotherTest() { }
    };
    __decorate([
        request_mapping_decorator_1.RequestMapping({ path: 'test' }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TestRoute.prototype, "getTest", null);
    __decorate([
        request_mapping_decorator_1.RequestMapping({ path: 'test', method: request_method_enum_1.RequestMethod.POST }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TestRoute.prototype, "postTest", null);
    __decorate([
        request_mapping_decorator_1.RequestMapping({ path: 'another-test', method: request_method_enum_1.RequestMethod.ALL }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], TestRoute.prototype, "anotherTest", null);
    TestRoute = __decorate([
        controller_decorator_1.Controller({ path: 'global' })
    ], TestRoute);
    let routerBuilder;
    beforeEach(() => {
        routerBuilder = new router_explorer_1.ExpressRouterExplorer(new metadata_scanner_1.MetadataScanner(), null);
    });
    describe('scanForPaths', () => {
        it('should method return expected list of route paths', () => {
            const paths = routerBuilder.scanForPaths(new TestRoute());
            chai_1.expect(paths).to.have.length(3);
            chai_1.expect(paths[0].path).to.eql('/test');
            chai_1.expect(paths[1].path).to.eql('/test');
            chai_1.expect(paths[2].path).to.eql('/another-test');
            chai_1.expect(paths[0].requestMethod).to.eql(request_method_enum_1.RequestMethod.GET);
            chai_1.expect(paths[1].requestMethod).to.eql(request_method_enum_1.RequestMethod.POST);
            chai_1.expect(paths[2].requestMethod).to.eql(request_method_enum_1.RequestMethod.ALL);
        });
    });
    describe('exploreMethodMetadata', () => {
        it('should method return expected object which represent single route', () => {
            const instance = new TestRoute();
            const instanceProto = Object.getPrototypeOf(instance);
            const route = routerBuilder.exploreMethodMetadata(new TestRoute(), instanceProto, 'getTest');
            chai_1.expect(route.path).to.eql('/test');
            chai_1.expect(route.requestMethod).to.eql(request_method_enum_1.RequestMethod.GET);
        });
    });
    describe('applyPathsToRouterProxy', () => {
        it('should method return expected object which represent single route', () => {
            const bindStub = sinon.stub(routerBuilder, 'applyCallbackToRouter');
            const paths = [
                { path: '', requestMethod: request_method_enum_1.RequestMethod.GET },
                { path: 'test', requestMethod: request_method_enum_1.RequestMethod.GET },
            ];
            routerBuilder.applyPathsToRouterProxy(null, paths, null);
            chai_1.expect(bindStub.calledWith(null, paths[0], null)).to.be.true;
            chai_1.expect(bindStub.callCount).to.be.eql(paths.length);
        });
    });
});
//# sourceMappingURL=router-explorer.spec.js.map