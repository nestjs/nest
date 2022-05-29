import { clc } from '@nestjs/common/utils/cli-colors.util';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { NestContainer } from '../../injector/container';
import { ReplContext } from '../../repl/repl-context';

describe('ReplContext', () => {
  let replContext: ReplContext;
  let mockApp: {
    container: NestContainer;
    get: sinon.SinonStub;
    resolve: sinon.SinonSpy;
    select: sinon.SinonSpy;
  };

  before(async () => {
    const container = new NestContainer();
    const aModuleRef = await container.addModule(class ModuleA {}, []);
    const bModuleRef = await container.addModule(class ModuleB {}, []);

    container.addController(class ControllerA {}, aModuleRef.token);
    container.addProvider(class ProviderA1 {}, aModuleRef.token);
    container.addProvider(class ProviderA2 {}, aModuleRef.token);

    container.addProvider(class ProviderB1 {}, bModuleRef.token);
    container.addProvider(class ProviderB2 {}, bModuleRef.token);

    mockApp = {
      container,
      get: sinon.stub(),
      resolve: sinon.spy(),
      select: sinon.spy(),
    };
    replContext = new ReplContext(mockApp as any);
  });

  beforeEach(() => {
    sinon.stub(clc, 'yellow').callsFake(text => text);
    sinon.stub(clc, 'green').callsFake(text => text);
  });
  afterEach(() => sinon.restore());

  describe('debug', () => {
    it('should print all modules along with their controllers and providers', () => {
      let outputText = '';

      sinon
        .stub(replContext as any, 'writeToStdout')
        .callsFake(text => (outputText += text));
      replContext.debug();

      expect(outputText).to.equal(`
ModuleA: 
 - controllers: 
  ◻ ControllerA
 - providers: 
  ◻ ProviderA1
  ◻ ProviderA2
ModuleB: 
 - providers: 
  ◻ ProviderB1
  ◻ ProviderB2

`);
    });

    describe('when module passed as a class reference', () => {
      it("should print a specified module's controllers and providers", () => {
        let outputText = '';

        sinon
          .stub(replContext as any, 'writeToStdout')
          .callsFake(text => (outputText += text));
        replContext.debug(class ModuleA {});

        expect(outputText).to.equal(`
ModuleA: 
 - controllers: 
  ◻ ControllerA
 - providers: 
  ◻ ProviderA1
  ◻ ProviderA2

`);
      });
    });
    describe("when module passed as a string (module's key)", () => {
      it("should print a specified module's controllers and providers", () => {
        let outputText = '';

        sinon
          .stub(replContext as any, 'writeToStdout')
          .callsFake(text => (outputText += text));
        replContext.debug('ModuleA');

        expect(outputText).to.equal(`
ModuleA: 
 - controllers: 
  ◻ ControllerA
 - providers: 
  ◻ ProviderA1
  ◻ ProviderA2

`);
      });
    });
  });

  describe('methods', () => {
    describe('when token is a class reference', () => {
      it('should print all class methods', () => {
        class BaseService {
          create() {}
        }
        class TestService extends BaseService {
          findAll() {}
          findOne() {}
        }

        let outputText = '';

        sinon
          .stub(replContext as any, 'writeToStdout')
          .callsFake(text => (outputText += text));
        replContext.methods(TestService);

        expect(outputText).to.equal(`
Methods: 
 ◻ findAll
 ◻ findOne
 ◻ create

`);
      });
    });

    describe('when token is a string', () => {
      it('should grab provider from the container and print its all methods', () => {
        class ProviderA1 {
          findAll() {}
          findOne() {}
        }
        let outputText = '';

        sinon
          .stub(replContext as any, 'writeToStdout')
          .callsFake(text => (outputText += text));

        mockApp.get.callsFake(() => new ProviderA1());
        replContext.methods('ProviderA1');

        expect(outputText).to.equal(`
Methods: 
 ◻ findAll
 ◻ findOne

`);
      });
    });
  });

  describe('get', () => {
    it('should pass arguments down to the application context', () => {
      const token = 'test';
      replContext.get(token);
      expect(mockApp.get.calledWith(token)).to.be.true;
    });
  });
  describe('resolve', () => {
    it('should pass arguments down to the application context', async () => {
      const token = 'test';
      const contextId = {};

      await replContext.resolve(token, contextId);
      expect(mockApp.resolve.calledWith(token, contextId)).to.be.true;
    });
  });
  describe('select', () => {
    it('should pass arguments down to the application context', () => {
      const moduleCls = class TestModule {};
      replContext.select(moduleCls);
      expect(mockApp.select.calledWith(moduleCls)).to.be.true;
    });
  });
});
