import * as sinon from 'sinon';
import { expect } from 'chai';
import { MiddlewaresInjector } from '../middlewares-injector';
import { UnkownModuleException } from '../../errors/exceptions/unkown-module.exception';
import { WebSocketGateway } from '../index';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';

describe('MiddlewaresInjector', () => {
    let injector: MiddlewaresInjector;
    let container;
    let modules;

    beforeEach(() => {
        modules = new Map();
        container = {
            getModules: () => modules,
        };
        injector = new MiddlewaresInjector(container as any);
    });
    describe('inject', () => {
        const tokens = [1, 2, 3];

        beforeEach(() => {
            sinon.stub(injector, 'reflectMiddlewaresTokens').returns(tokens);
        });
        it('should throws "UnkownModuleException" when module is not known', () => {
            sinon.stub(modules, 'has').returns(false);
            expect(
                () => injector.inject(null, null, ''),
            ).to.throws(UnkownModuleException);
        });
        it('should call "applyMiddlewares" with expected arguments', () => {
            const components = {};

            sinon.stub(modules, 'has').returns(true);
            sinon.stub(modules, 'get').returns({components});

            const stub: sinon.SinonStub = sinon.stub(injector, 'applyMiddlewares');
            const server = {};

            injector.inject(server, null, '');
            expect(stub.calledWith(server, components, tokens)).to.be.true;
        });
    });
    describe('reflectMiddlewaresTokens', () => {
        const middlewares: any = [1, 2, 3];
        @WebSocketGateway({
            middlewares,
        })
        class Test {}
        it('should returns expected list of middlewares', () => {
            expect(
                injector.reflectMiddlewaresTokens(new Test()),
            ).to.be.equal(middlewares);
        });
    });
    describe('applyMiddlewares', () => {
        let server: { use: sinon.SinonSpy };
        const setAsName = name => ({ name });
        const tokens = [1, null, 'test', undefined];

        beforeEach(() => {
            server = {
                use: sinon.spy(),
            };
            sinon.stub(injector, 'bindMiddleware').callsFake(a => a);
        });
        it('should apply expected middlewares', () => {
            injector.applyMiddlewares(server, null, tokens.map(setAsName) as any);
            expect(server.use.callCount).to.be.eql(2);
            expect(server.use.calledWith(1)).to.be.true;
        });
    });
    describe('bindMiddleware', () => {
        let stub: sinon.SinonStub;
        const components = new Map();
        it('should throws "RuntimeException" when middleware does not exists in collection', () => {
            stub = sinon.stub(components, 'has').returns(false);
            expect(
                () => injector.bindMiddleware('', components),
            ).to.throws(RuntimeException);
        });
        describe('when components collection "has" method returns true', () => {
            let getStub: sinon.SinonStub;
            before(() => {
                getStub = sinon.stub(components, 'get');
            });
            beforeEach(() => {
                stub.returns(true);
            });
            it('should returns null when object is not a gateway middleware', () => {
                const instance = {};
                getStub.returns({instance});
                expect(injector.bindMiddleware('', components)).to.be.null;
            });
            it('should returns null when result of "object.resolve()" operation is not a function', () => {
                const instance = { resolve() { return ({}); }};
                getStub.returns({instance});

                expect(injector.bindMiddleware('', components)).to.be.null;
            });
            it('should returns function', () => {
                const instance = { resolve() { return () => ({}); }};
                getStub.returns({instance});

                expect(injector.bindMiddleware('', components)).to.be.a('function');
            });
        });
    });
    describe('isGatewayMiddleware', () => {
        class ValidGateway {
            public resolve() {
                return (...args) => ({});
            }
        }
        it('should returns false when object is not a gateway middleware', () => {
            expect(injector.isGatewayMiddleware(new ValidGateway())).to.be.true;
        });
        it('should returns true when object is not a gateway middleware', () => {
            expect(injector.isGatewayMiddleware({})).to.be.false;
        });
    });
});