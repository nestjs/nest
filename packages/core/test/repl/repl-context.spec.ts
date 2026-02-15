import { NestContainer } from '../../injector/container.js';
import { ReplContext } from '../../repl/repl-context.js';

describe('ReplContext', () => {
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

  afterEach(() => vi.restoreAllMocks());

  it('writeToStdout', () => {
    const stdOutWrite = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => ({}) as any);
    const text = vi.fn() as unknown as string;

    replContext.writeToStdout(text);

    expect(stdOutWrite).toHaveBeenCalledOnce();
    expect(stdOutWrite).toHaveBeenCalledWith(text);
  });
});
