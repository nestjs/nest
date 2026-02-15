import { GetReplFn } from '../../../repl/native-functions/index.js';
import { ReplContext } from '../../../repl/repl-context.js';
import { NestContainer } from '../../../injector/container.js';

describe('GetReplFn', () => {
  let getReplFn: GetReplFn;

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
    getReplFn = replContext.nativeFunctions.get('get') as GetReplFn;
  });
  afterEach(() => vi.restoreAllMocks());

  it('the function name should be "get"', () => {
    expect(getReplFn).not.toBeUndefined();
    expect(getReplFn.fnDefinition.name).toEqual('get');
  });

  describe('action', () => {
    it('should pass arguments down to the application context', () => {
      const token = 'test';
      getReplFn.action(token);
      expect(mockApp.get).toHaveBeenCalledWith(token);
    });
  });
});
