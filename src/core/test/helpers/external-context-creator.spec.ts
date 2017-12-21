import * as sinon from 'sinon';
import { expect } from 'chai';
import { GuardsConsumer } from '../../guards/guards-consumer';
import { GuardsContextCreator } from '../../guards/guards-context-creator';
import { ModulesContainer } from '../../injector/modules-container';
import { NestContainer } from '../../injector/container';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';
import { ExternalContextCreator } from '../../helpers/external-context-creator';

describe('ExternalContextCreator', () => {
  let contextCreator: ExternalContextCreator;
  let callback;
  let applySpy: sinon.SinonSpy;
  let bindSpy: sinon.SinonSpy;
  let guardsConsumer: GuardsConsumer;

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({})
    };
    bindSpy = sinon.spy(callback, 'bind');
    applySpy = sinon.spy(callback, 'apply');

    guardsConsumer = new GuardsConsumer();
    contextCreator = new ExternalContextCreator(
      new GuardsContextCreator(new NestContainer()),
      guardsConsumer,
      new InterceptorsContextCreator(new NestContainer()),
      new InterceptorsConsumer(),
      new ModulesContainer()
    );
  });
  describe('create', () => {
    it('should call "findContextModuleName" with expected argument', done => {
      const findContextModuleNameSpy = sinon.spy(
        contextCreator,
        'findContextModuleName'
      );
      contextCreator.create({ foo: 'bar' }, callback as any, '');
      expect(findContextModuleNameSpy.called).to.be.true;
      done();
    });
    describe('returns proxy function', () => {
      let proxyContext;
      let instance;

      beforeEach(() => {
        instance = { foo: 'bar' };
        proxyContext = contextCreator.create(instance, callback as any, '');
      });
      it('should be a function', () => {
        expect(proxyContext).to.be.a('function');
      });
      describe('when proxy function called', () => {
        describe('when can not activate', () => {
          it('should throw exception when "tryActivate" returns false', () => {
            sinon.stub(guardsConsumer, 'tryActivate', () => false);
            expect(proxyContext(1, 2, 3)).to.eventually.throw();
          });
        });
        describe('when can activate', () => {
          it('should apply context and args', async () => {
            const args = [1, 2, 3];
            sinon.stub(guardsConsumer, 'tryActivate', () => true);

            await proxyContext(...args);
            expect(applySpy.calledWith(instance, args)).to.be.true;
          });
        });
      });
    });
  });
  describe('findContextModuleName', () => {
    describe('when constructor name is undefined', () => {
      it('should return empty string', () => {
        expect(contextCreator.findContextModuleName({} as any)).to.be.eql('');
      });
    });
    describe('when component exists', () => {
      it('should return module key', () => {
        const modules = new Map();
        const componentKey = 'test';
        const moduleKey = 'key';

        modules.set(moduleKey, {});
        (contextCreator as any).modulesContainer = modules;
        sinon.stub(contextCreator, 'findComponentByClassName', () => true);

        expect(
          contextCreator.findContextModuleName({ name: componentKey } as any)
        ).to.be.eql(moduleKey);
      });
    });
    describe('when component does not exists', () => {
      it('should return empty string', () => {
        sinon.stub(contextCreator, 'findComponentByClassName', () => false);
        expect(contextCreator.findContextModuleName({} as any)).to.be.eql('');
      });
    });
  });
  describe('findComponentByClassName', () => {
    describe('when component exists', () => {
      it('should return true', () => {
        const components = new Map();
        const key = 'test';
        components.set(key, key);

        expect(
          contextCreator.findComponentByClassName(
            {
              components
            } as any,
            key
          )
        ).to.be.true;
      });
    });
    describe('when component does not exists', () => {
      it('should return false', () => {
        const components = new Map();
        const key = 'test';
        expect(
          contextCreator.findComponentByClassName(
            {
              components
            } as any,
            key
          )
        ).to.be.false;
      });
    });
  });
});
