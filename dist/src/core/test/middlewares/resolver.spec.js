"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const resolver_1 = require("../../middlewares/resolver");
const container_1 = require("../../middlewares/container");
const component_decorator_1 = require("../../../common/utils/decorators/component.decorator");
const logger_service_1 = require("../../../common/services/logger.service");
const nest_environment_enum_1 = require("../../../common/enums/nest-environment.enum");
describe('MiddlewaresResolver', () => {
    let TestMiddleware = class TestMiddleware {
        resolve() {
            return (req, res, next) => { };
        }
    };
    TestMiddleware = __decorate([
        component_decorator_1.Component()
    ], TestMiddleware);
    let resolver;
    let container;
    let mockContainer;
    before(() => logger_service_1.Logger.setMode(nest_environment_enum_1.NestEnvironment.TEST));
    beforeEach(() => {
        container = new container_1.MiddlewaresContainer();
        resolver = new resolver_1.MiddlewaresResolver(container);
        mockContainer = sinon.mock(container);
    });
    it('should resolve middleware instances from container', () => {
        const loadInstanceOfMiddleware = sinon.stub(resolver['instanceLoader'], 'loadInstanceOfMiddleware');
        const middlewares = new Map();
        const wrapper = {
            instance: { metatype: {} },
            metatype: TestMiddleware
        };
        middlewares.set('TestMiddleware', wrapper);
        const module = { metatype: { name: '' } };
        mockContainer.expects('getMiddlewares').returns(middlewares);
        resolver.resolveInstances(module, null);
        chai_1.expect(loadInstanceOfMiddleware.callCount).to.be.equal(middlewares.size);
        chai_1.expect(loadInstanceOfMiddleware.calledWith(wrapper, middlewares, module)).to.be.true;
        loadInstanceOfMiddleware.restore();
    });
});
//# sourceMappingURL=resolver.spec.js.map