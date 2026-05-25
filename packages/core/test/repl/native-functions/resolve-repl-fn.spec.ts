import { ResolveReplFn } from '../../../repl/native-functions/index.js';
import { ReplContext } from '../../../repl/repl-context.js';
import { NestContainer } from '../../../injector/container.js';

describe('ResolveReplFn', () => {
  let resolveReplFn: ResolveReplFn;

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
    resolveReplFn = replContext.nativeFunctions.get('resolve') as ResolveReplFn;
  });
  afterEach(() => vi.restoreAllMocks());

  it('the function name should be "resolve"', () => {
    expect(resolveReplFn).not.toBeUndefined();
    expect(resolveReplFn.fnDefinition.name).toEqual('resolve');
  });

  describe('action', () => {
    it('should pass arguments down to the application context', async () => {
      const token = 'test';
      const contextId = {};

      await resolveReplFn.action(token, contextId);
      expect(mockApp.resolve).toHaveBeenCalledWith(token, contextId);
    });
  });
});
