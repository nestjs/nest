import { SelectReplFn } from '../../../repl/native-functions/index.js';
import { ReplContext } from '../../../repl/repl-context.js';
import { NestContainer } from '../../../injector/container.js';

describe('SelectReplFn', () => {
  let selectReplFn: SelectReplFn;

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
    selectReplFn = replContext.nativeFunctions.get('select') as SelectReplFn;
  });
  afterEach(() => vi.restoreAllMocks());

  it('the function name should be "select"', () => {
    expect(selectReplFn).not.toBeUndefined();
    expect(selectReplFn.fnDefinition.name).toEqual('select');
  });

  describe('action', () => {
    it('should pass arguments down to the application context', () => {
      const moduleCls = class TestModule {};
      selectReplFn.action(moduleCls);
      expect(mockApp.select).toHaveBeenCalledWith(moduleCls);
    });
  });
});
