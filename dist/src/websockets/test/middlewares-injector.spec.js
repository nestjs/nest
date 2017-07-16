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
const middlewares_injector_1 = require("../middlewares-injector");
const index_1 = require("../index");
const application_config_1 = require("@nestjs/core/application-config");
describe('MiddlewaresInjector', () => {
    let injector;
    let container;
    let modules;
    beforeEach(() => {
        modules = new Map();
        container = {
            getModules: () => modules,
        };
        injector = new middlewares_injector_1.MiddlewaresInjector(container, new application_config_1.ApplicationConfig());
    });
    describe('inject', () => {
        const tokens = [1, 2, 3];
        beforeEach(() => {
            sinon.stub(injector, 'reflectMiddlewaresTokens').returns(tokens);
        });
        it('should throws exception when module is not known', () => {
            sinon.stub(modules, 'has').returns(false);
            chai_1.expect(() => injector.inject(null, null, '')).to.throws(Error);
        });
        it('should call "applyMiddlewares" with expected arguments', () => {
            const components = {};
            sinon.stub(modules, 'has').returns(true);
            sinon.stub(modules, 'get').returns({ components });
            const stub = sinon.stub(injector, 'applyMiddlewares');
            const server = {};
            injector.inject(server, null, '');
            chai_1.expect(stub.calledWith(server, components, tokens)).to.be.true;
        });
    });
    describe('reflectMiddlewaresTokens', () => {
        const middlewares = [1, 2, 3];
        let Test = class Test {
        };
        Test = __decorate([
            index_1.WebSocketGateway({
                middlewares,
            })
        ], Test);
        it('should returns expected list of middlewares', () => {
            chai_1.expect(injector.reflectMiddlewaresTokens(new Test())).to.be.equal(middlewares);
        });
    });
    describe('applyMiddlewares', () => {
        let server;
        const setAsName = name => ({ name });
        const tokens = [1, null, 'test', undefined];
        beforeEach(() => {
            server = {
                use: sinon.spy(),
            };
            sinon.stub(injector, 'bindMiddleware').callsFake(a => a);
        });
        it('should apply expected middlewares', () => {
            injector.applyMiddlewares(server, null, tokens.map(setAsName));
            chai_1.expect(server.use.callCount).to.be.eql(2);
            chai_1.expect(server.use.calledWith(1)).to.be.true;
        });
    });
    describe('bindMiddleware', () => {
        let stub;
        const components = new Map();
        it('should throws exception when middleware does not exists in collection', () => {
            stub = sinon.stub(components, 'has').returns(false);
            chai_1.expect(() => injector.bindMiddleware('', components)).to.throws(Error);
        });
        describe('when components collection "has" method returns true', () => {
            let getStub;
            before(() => {
                getStub = sinon.stub(components, 'get');
            });
            beforeEach(() => {
                stub.returns(true);
            });
            it('should returns null when object is not a gateway middleware', () => {
                const instance = {};
                getStub.returns({ instance });
                chai_1.expect(injector.bindMiddleware('', components)).to.be.null;
            });
            it('should returns null when result of "object.resolve()" operation is not a function', () => {
                const instance = { resolve() { return ({}); } };
                getStub.returns({ instance });
                chai_1.expect(injector.bindMiddleware('', components)).to.be.null;
            });
            it('should returns function', () => {
                const instance = { resolve() { return () => ({}); } };
                getStub.returns({ instance });
                chai_1.expect(injector.bindMiddleware('', components)).to.be.a('function');
            });
        });
    });
    describe('isGatewayMiddleware', () => {
        class ValidGateway {
            resolve() {
                return (...args) => ({});
            }
        }
        it('should returns false when object is not a gateway middleware', () => {
            chai_1.expect(injector.isGatewayMiddleware(new ValidGateway())).to.be.true;
        });
        it('should returns true when object is not a gateway middleware', () => {
            chai_1.expect(injector.isGatewayMiddleware({})).to.be.false;
        });
    });
});
//# sourceMappingURL=middlewares-injector.spec.js.map