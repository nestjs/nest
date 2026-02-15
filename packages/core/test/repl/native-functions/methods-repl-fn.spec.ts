import { clc } from '@nestjs/common/utils/cli-colors.util.js';
import { NestContainer } from '../../../injector/container.js';
import { MethodsReplFn } from '../../../repl/native-functions/index.js';
import { ReplContext } from '../../../repl/repl-context.js';

describe('MethodsReplFn', () => {
  let methodsReplFn: MethodsReplFn;

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

    container.addProvider(class ProviderB1 {}, bModuleRef.token);
    container.addProvider(class ProviderB2 {}, bModuleRef.token);

    mockApp = {
      container,
      get: vi.fn(),
      resolve: vi.fn(),
      select: vi.fn(),
    };
    replContext = new ReplContext(mockApp as any);
  });

  beforeEach(() => {
    methodsReplFn = replContext.nativeFunctions.get('methods') as MethodsReplFn;

    // To avoid coloring the output:
    vi.spyOn(clc, 'yellow').mockImplementation(text => text);
    vi.spyOn(clc, 'green').mockImplementation(text => text);
  });
  afterEach(() => vi.restoreAllMocks());

  it('the function name should be "methods"', () => {
    expect(methodsReplFn).not.toBeUndefined();
    expect(methodsReplFn.fnDefinition.name).toEqual('methods');
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

        vi.spyOn(replContext, 'writeToStdout').mockImplementation(
          text => (outputText += text),
        );

        methodsReplFn.action(TestService);

        expect(outputText).toBe(`
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

        vi.spyOn(replContext, 'writeToStdout').mockImplementation(
          text => (outputText += text),
        );

        mockApp.get.mockImplementation(() => new ProviderA1());

        methodsReplFn.action('ProviderA1');

        expect(outputText).toBe(`
Methods:
 ◻ findAll
 ◻ findOne

`);
      });
    });
  });
});
