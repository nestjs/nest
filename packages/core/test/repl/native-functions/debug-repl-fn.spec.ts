import { clc } from '@nestjs/common/utils/cli-colors.util';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { NestContainer } from '../../../injector/container';
import { DebugReplFn } from '../../../repl/native-functions';
import { ReplContext } from '../../../repl/repl-context';

describe('DebugReplFn', () => {
  let debugReplFn: DebugReplFn;

  let replContext: ReplContext;
  let mockApp: {
    container: NestContainer;
    get: sinon.SinonStub;
    resolve: sinon.SinonSpy;
    select: sinon.SinonSpy;
  };

  before(async () => {
    const container = new NestContainer();
    const { moduleRef: aModuleRef } = (await container.addModule(
      class ModuleA {},
      [],
    ))!;
    const { moduleRef: bModuleRef } = (await container.addModule(
      class ModuleB {},
      [],
    ))!;

    container.addController(class ControllerA {}, aModuleRef.token);
    container.addProvider(class ProviderA1 {}, aModuleRef.token);
    container.addProvider(class ProviderA2 {}, aModuleRef.token);
    container.addProvider(class SharedProvider {}, aModuleRef.token);
    container.addProvider(
      { provide: 'StringToken', useValue: 123 },
      aModuleRef.token,
    );

    container.addProvider(class ProviderB1 {}, bModuleRef.token);
    container.addProvider(class ProviderB2 {}, bModuleRef.token);
    container.addProvider(class SharedProvider {}, bModuleRef.token);

    mockApp = {
      container,
      get: sinon.stub(),
      resolve: sinon.spy(),
      select: sinon.spy(),
    };
    replContext = new ReplContext(mockApp as any);
  });

  beforeEach(() => {
    debugReplFn = replContext.nativeFunctions.get('debug') as DebugReplFn;

    // To avoid coloring the output:
    sinon.stub(clc, 'yellow').callsFake(text => text);
    sinon.stub(clc, 'green').callsFake(text => text);
  });
  afterEach(() => sinon.restore());

  it('the function name should be "debug"', () => {
    expect(debugReplFn).to.not.be.undefined;
    expect(debugReplFn.fnDefinition.name).to.eql('debug');
  });

  describe('action', () => {
    it('should print all modules along with their controllers and providers', () => {
      let outputText = '';

      sinon
        .stub(replContext, 'writeToStdout')
        .callsFake(text => (outputText += text));

      debugReplFn.action();

      expect(outputText).to.equal(`
ModuleA:
 - controllers:
  ◻ ControllerA
 - providers:
  ◻ ProviderA1
  ◻ ProviderA2
  ◻ SharedProvider
  ◻ "StringToken"
ModuleB:
 - providers:
  ◻ ProviderB1
  ◻ ProviderB2
  ◻ SharedProvider

`);
    });

    describe('when module passed as a class reference', () => {
      it("should print a specified module's controllers and providers", () => {
        let outputText = '';

        sinon
          .stub(replContext, 'writeToStdout')
          .callsFake(text => (outputText += text));

        debugReplFn.action(class ModuleA {});

        expect(outputText).to.equal(`
ModuleA:
 - controllers:
  ◻ ControllerA
 - providers:
  ◻ ProviderA1
  ◻ ProviderA2
  ◻ SharedProvider
  ◻ "StringToken"

`);
      });
    });
    describe("when module passed as a string (module's key)", () => {
      it("should print a specified module's controllers and providers", () => {
        let outputText = '';

        sinon
          .stub(replContext, 'writeToStdout')
          .callsFake(text => (outputText += text));

        debugReplFn.action('ModuleA');

        expect(outputText).to.equal(`
ModuleA:
 - controllers:
  ◻ ControllerA
 - providers:
  ◻ ProviderA1
  ◻ ProviderA2
  ◻ SharedProvider
  ◻ "StringToken"

`);
      });
    });
  });
});
