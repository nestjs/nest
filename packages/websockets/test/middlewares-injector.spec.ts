import * as sinon from 'sinon';
import { expect } from 'chai';
import { MiddlewareInjector } from '../middleware-injector';
import { UnknownModuleException } from '../../core/errors/exceptions/unknown-module.exception';
import { WebSocketGateway, IoAdapter } from '../index';
import { RuntimeException } from '../../core/errors/exceptions/runtime.exception';
import { ApplicationConfig } from '@nestjs/core/application-config';

describe('MiddlewareInjector', () => {
  let injector: MiddlewareInjector;
  let container;
  let modules;

  beforeEach(() => {
    modules = new Map();
    container = {
      getModules: () => modules,
    };
    injector = new MiddlewareInjector(
      container as any,
      new ApplicationConfig(new IoAdapter()),
    );
  });
  describe('inject', () => {
    const tokens = [1, 2, 3];

    beforeEach(() => {
      sinon.stub(injector, 'reflectMiddlewareTokens').returns(tokens);
    });
    it('should throws exception when module is not known', () => {
      sinon.stub(modules, 'has').returns(false);
      expect(() => injector.inject(null, null, '')).to.throws(Error);
    });
    it('should call "applyMiddleware" with expected arguments', () => {
      const components = {};

      sinon.stub(modules, 'has').returns(true);
      sinon.stub(modules, 'get').returns({ components });

      const stub: sinon.SinonStub = sinon.stub(injector, 'applyMiddleware');
      const server = {};

      injector.inject(server, null, '');
      expect(stub.calledWith(server, components, tokens)).to.be.true;
    });
  });
  describe('reflectMiddlewareTokens', () => {
    const middleware: any = [1, 2, 3];
    @WebSocketGateway({
      middleware,
    })
    class Test {}
    it('should returns expected list of middleware', () => {
      expect(injector.reflectMiddlewareTokens(new Test())).to.be.equal(
        middleware,
      );
    });
  });
  describe('applyMiddleware', () => {
    let server: { use: sinon.SinonSpy };
    const setAsName = name => ({ name });
    const tokens = [1, null, 'test', undefined];

    beforeEach(() => {
      server = {
        use: sinon.spy(),
      };
      sinon.stub(injector, 'bindMiddleware').callsFake(a => a);
    });
    it('should apply expected middleware', () => {
      injector.applyMiddleware(server, null, tokens.map(setAsName) as any);
      expect(server.use.callCount).to.be.eql(2);
      expect(server.use.calledWith(1)).to.be.true;
    });
  });
  describe('bindMiddleware', () => {
    let stub: sinon.SinonStub;
    const components = new Map();
    it('should throws exception when middleware does not exists in collection', () => {
      stub = sinon.stub(components, 'has').returns(false);
      expect(() => injector.bindMiddleware('', components)).to.throws(Error);
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
        getStub.returns({ instance });
        expect(injector.bindMiddleware('', components)).to.be.null;
      });
      it('should returns null when result of "object.resolve()" operation is not a function', () => {
        const instance = {
          resolve() {
            return {};
          },
        };
        getStub.returns({ instance });

        expect(injector.bindMiddleware('', components)).to.be.null;
      });
      it('should returns function', () => {
        const instance = {
          resolve() {
            return () => ({});
          },
        };
        getStub.returns({ instance });

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
