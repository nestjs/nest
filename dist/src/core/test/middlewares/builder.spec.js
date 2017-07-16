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
const builder_1 = require("../../middlewares/builder");
const invalid_middleware_configuration_exception_1 = require("../../errors/exceptions/invalid-middleware-configuration.exception");
const routes_mapper_1 = require("../../middlewares/routes-mapper");
const index_1 = require("../../../index");
describe('MiddlewareBuilder', () => {
    let builder;
    beforeEach(() => {
        builder = new builder_1.MiddlewareBuilder(new routes_mapper_1.RoutesMapper());
    });
    describe('apply', () => {
        let configProxy;
        beforeEach(() => {
            configProxy = builder.apply([]);
        });
        it('should return configuration proxy', () => {
            const metatype = builder_1.MiddlewareBuilder.ConfigProxy;
            chai_1.expect(configProxy instanceof metatype).to.be.true;
        });
        describe('configuration proxy', () => {
            it('should returns itself on "with()" call', () => {
                chai_1.expect(configProxy.with()).to.be.eq(configProxy);
            });
            describe('when "forRoutes()" called', () => {
                let Test = class Test {
                    getAll() { }
                };
                __decorate([
                    index_1.Get('route'),
                    __metadata("design:type", Function),
                    __metadata("design:paramtypes", []),
                    __metadata("design:returntype", void 0)
                ], Test.prototype, "getAll", null);
                Test = __decorate([
                    index_1.Controller('path')
                ], Test);
                const route = { path: '/test', method: 0 };
                it('should store configuration passed as argument', () => {
                    configProxy.forRoutes(route, Test);
                    chai_1.expect(builder.build()).to.deep.equal([{
                            middlewares: [],
                            forRoutes: [route, {
                                    path: '/path/route',
                                    method: 0,
                                }],
                        }]);
                });
            });
        });
    });
    describe('use', () => {
        it('should store configuration passed as argument', () => {
            builder.use({
                middlewares: 'Test',
                forRoutes: 'Test',
            });
            chai_1.expect(builder.build()).to.deep.equal([{
                    middlewares: 'Test',
                    forRoutes: 'Test',
                }]);
        });
        it('should be possible to chain "use" calls', () => {
            builder.use({
                middlewares: 'Test',
                forRoutes: 'Test',
            }).use({
                middlewares: 'Test',
                forRoutes: 'Test',
            });
            chai_1.expect(builder.build()).to.deep.equal([{
                    middlewares: 'Test',
                    forRoutes: 'Test',
                }, {
                    middlewares: 'Test',
                    forRoutes: 'Test',
                }]);
        });
        it('should throw exception when middleware configuration object is invalid', () => {
            chai_1.expect(builder.use.bind(builder, 'test')).throws(invalid_middleware_configuration_exception_1.InvalidMiddlewareConfigurationException);
        });
    });
});
//# sourceMappingURL=builder.spec.js.map