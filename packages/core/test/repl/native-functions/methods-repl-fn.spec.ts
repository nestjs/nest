import { expect } from 'chai';
import * as sinon from 'sinon';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import { MethodsReplFn } from '../../../repl/native-functions';
import { ReplContext } from '../../../repl/repl-context';
import { NestContainer } from '../../../injector/container';

describe('MethodsReplFn', () => {
  let methodsReplFn: MethodsReplFn;

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
    methodsReplFn = replContext.nativeFunctions.get('methods') as MethodsReplFn;

    // To avoid coloring the output:
    sinon.stub(clc, 'yellow').callsFake(text => text);
    sinon.stub(clc, 'green').callsFake(text => text);
  });
  afterEach(() => sinon.restore());

  it('the function name should be "methods"', () => {
    expect(methodsReplFn).to.not.be.undefined;
    expect(methodsReplFn.fnDefinition.name).to.eql('methods');
  });

  describe('action', () => {
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
          .stub(replContext, 'writeToStdout')
          .callsFake(text => (outputText += text));

        methodsReplFn.action(TestService);

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
          .stub(replContext, 'writeToStdout')
          .callsFake(text => (outputText += text));

        mockApp.get.callsFake(() => new ProviderA1());

        methodsReplFn.action('ProviderA1');

        expect(outputText).to.equal(`
Methods:
 ◻ findAll
 ◻ findOne

`);
      });
    });
  });
});
