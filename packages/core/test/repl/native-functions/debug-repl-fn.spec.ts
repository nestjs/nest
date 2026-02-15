import { clc } from '@nestjs/common/utils/cli-colors.util.js';
import { NestContainer } from '../../../injector/container.js';
import { DebugReplFn } from '../../../repl/native-functions/index.js';
import { ReplContext } from '../../../repl/repl-context.js';

describe('DebugReplFn', () => {
  let debugReplFn: DebugReplFn;

  let replContext: ReplContext;
  let mockApp: {
    container: NestContainer;
    get: ReturnType<typeof vi.fn>;
    resolve: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
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
      get: vi.fn(),
      resolve: vi.fn(),
      select: vi.fn(),
    };
    replContext = new ReplContext(mockApp as any);
  });

  beforeEach(() => {
    debugReplFn = replContext.nativeFunctions.get('debug') as DebugReplFn;

    // To avoid coloring the output:
    vi.spyOn(clc, 'yellow').mockImplementation(text => text);
    vi.spyOn(clc, 'green').mockImplementation(text => text);
  });
  afterEach(() => vi.restoreAllMocks());

  it('the function name should be "debug"', () => {
    expect(debugReplFn).not.toBeUndefined();
    expect(debugReplFn.fnDefinition.name).toEqual('debug');
  });

  describe('action', () => {
    it('should print all modules along with their controllers and providers', () => {
      let outputText = '';

      vi.spyOn(replContext, 'writeToStdout').mockImplementation(
        text => (outputText += text),
      );

      debugReplFn.action();

      expect(outputText).toBe(`
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

        vi.spyOn(replContext, 'writeToStdout').mockImplementation(
          text => (outputText += text),
        );

        debugReplFn.action(class ModuleA {});

        expect(outputText).toBe(`
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

        vi.spyOn(replContext, 'writeToStdout').mockImplementation(
          text => (outputText += text),
        );

        debugReplFn.action('ModuleA');

        expect(outputText).toBe(`
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
