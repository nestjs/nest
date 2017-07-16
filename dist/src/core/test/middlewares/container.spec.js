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
const container_1 = require("../../middlewares/container");
const component_decorator_1 = require("../../../common/utils/decorators/component.decorator");
const controller_decorator_1 = require("../../../common/utils/decorators/controller.decorator");
const request_mapping_decorator_1 = require("../../../common/utils/decorators/request-mapping.decorator");
const request_method_enum_1 = require("../../../common/enums/request-method.enum");
describe('MiddlewaresContainer', () => {
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
    let container;
    beforeEach(() => {
        container = new container_1.MiddlewaresContainer();
    });
    it('should store expected configurations for given module', () => {
        const config = [{
                middlewares: [TestMiddleware],
                forRoutes: [
                    TestRoute,
                    { path: 'test' },
                ],
            },
        ];
        container.addConfig(config, 'Module');
        chai_1.expect([...container.getConfigs().get('Module')]).to.deep.equal(config);
    });
    it('should store expected middlewares for given module', () => {
        const config = [{
                middlewares: TestMiddleware,
                forRoutes: [TestRoute],
            },
        ];
        const key = 'Test';
        container.addConfig(config, key);
        chai_1.expect(container.getMiddlewares(key).size).to.eql(config.length);
        chai_1.expect(container.getMiddlewares(key).get('TestMiddleware')).to.eql({
            instance: null,
            metatype: TestMiddleware,
        });
    });
});
//# sourceMappingURL=container.spec.js.map