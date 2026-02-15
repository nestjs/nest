import { clc } from '@nestjs/common/utils/cli-colors.util.js';
import { NestContainer } from '../../../injector/container.js';
import { HelpReplFn } from '../../../repl/native-functions/index.js';
import { ReplContext } from '../../../repl/repl-context.js';

describe('HelpReplFn', () => {
  let helpReplFn: HelpReplFn;

  let replContext: ReplContext;
  let mockApp: {
    container: NestContainer;
    get: ReturnType<typeof vi.fn>;
    resolve: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    const container = new NestContainer();

    mockApp = {
      container,
      get: vi.fn(),
      resolve: vi.fn(),
      select: vi.fn(),
    };
    replContext = new ReplContext(mockApp as any);
  });

  beforeEach(() => {
    helpReplFn = replContext.nativeFunctions.get('help') as HelpReplFn;

    // To avoid coloring the output:
    vi.spyOn(clc, 'bold').mockImplementation(text => text);
    vi.spyOn(clc, 'cyanBright').mockImplementation(text => text);
  });
  afterEach(() => vi.restoreAllMocks());

  it('the function name should be "help"', () => {
    expect(helpReplFn).not.toBeUndefined();
    expect(helpReplFn.fnDefinition.name).toEqual('help');
  });

  describe('action', () => {
    it('should print all available native functions and their description', () => {
      let outputText = '';
      vi.spyOn(replContext, 'writeToStdout').mockImplementation(
        text => (outputText += text),
      );

      helpReplFn.action();

      expect(outputText)
        .toEqual(`You can call .help on any function listed below (e.g.: help.help):

$ - Retrieves an instance of either injectable or controller, otherwise, throws exception.
debug - Print all registered modules as a list together with their controllers and providers.
If the argument is passed in, for example, "debug(MyModule)" then it will only print components of this specific module.
get - Retrieves an instance of either injectable or controller, otherwise, throws exception.
help - Display all available REPL native functions.
methods - Display all public methods available on a given provider or controller.
resolve - Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.
select - Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.
`);
    });
  });
});
