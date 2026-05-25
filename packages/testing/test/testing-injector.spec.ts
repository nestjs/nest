import { TestingInjector } from '../testing-injector.js';

describe('TestingInjector', () => {
  let injector: TestingInjector;

  beforeEach(() => {
    injector = new TestingInjector({ preview: false });
  });

  describe('setMocker', () => {
    it('should store the mocker factory', () => {
      const mocker = vi.fn();
      injector.setMocker(mocker);

      expect(injector['mocker']).toBe(mocker);
    });
  });

  describe('setContainer', () => {
    it('should store the container reference', () => {
      const container = { getModules: vi.fn() } as any;
      injector.setContainer(container);

      expect(injector['container']).toBe(container);
    });
  });

  describe('resolveComponentWrapper', () => {
    it('should delegate to super and return existing wrapper on success', async () => {
      const expectedWrapper = { name: 'TestWrapper' };
      vi.spyOn(
        Object.getPrototypeOf(TestingInjector.prototype),
        'resolveComponentWrapper',
      ).mockResolvedValue(expectedWrapper);

      const result = await injector.resolveComponentWrapper(
        {} as any,
        'TestToken',
        {} as any,
        {} as any,
      );

      expect(result).toBe(expectedWrapper);
    });

    it('should throw when super fails and no mocker is set', async () => {
      vi.spyOn(
        Object.getPrototypeOf(TestingInjector.prototype),
        'resolveComponentWrapper',
      ).mockRejectedValue(new Error('Not found'));

      await expect(
        injector.resolveComponentWrapper(
          {} as any,
          'TestToken',
          {} as any,
          {} as any,
        ),
      ).rejects.toThrow('Not found');
    });

    it('should use mocker when super fails and mocker is set', async () => {
      vi.spyOn(
        Object.getPrototypeOf(TestingInjector.prototype),
        'resolveComponentWrapper',
      ).mockRejectedValue(new Error('Not found'));

      const mockInstance = { mocked: true };
      const mocker = vi.fn().mockReturnValue(mockInstance);
      injector.setMocker(mocker);

      const mockContainer = {
        getInternalCoreModuleRef: vi.fn().mockReturnValue({
          addCustomProvider: vi.fn(),
          addExportedProviderOrModule: vi.fn(),
          providers: new Map(),
        }),
      } as any;
      injector.setContainer(mockContainer);

      const result = await injector.resolveComponentWrapper(
        {} as any,
        'TestToken',
        {} as any,
        { metatype: class {} as any, scope: 0 } as any,
      );

      expect(mocker).toHaveBeenCalledWith('TestToken');
      expect(result.instance).toBe(mockInstance);
    });

    it('should throw when mocker returns falsy value', async () => {
      vi.spyOn(
        Object.getPrototypeOf(TestingInjector.prototype),
        'resolveComponentWrapper',
      ).mockRejectedValue(new Error('Not found'));

      const mocker = vi.fn().mockReturnValue(undefined);
      injector.setMocker(mocker);

      await expect(
        injector.resolveComponentWrapper(
          {} as any,
          'TestToken',
          {} as any,
          {} as any,
        ),
      ).rejects.toThrow('Not found');
    });
  });

  describe('resolveComponentHost', () => {
    it('should delegate to super and return existing wrapper on success', async () => {
      const expectedWrapper = { name: 'TestWrapper' };
      vi.spyOn(
        Object.getPrototypeOf(TestingInjector.prototype),
        'resolveComponentHost',
      ).mockResolvedValue(expectedWrapper);

      const result = await injector.resolveComponentHost(
        {} as any,
        { name: 'TestName' } as any,
      );

      expect(result).toBe(expectedWrapper);
    });

    it('should throw when super fails and no mocker is set', async () => {
      vi.spyOn(
        Object.getPrototypeOf(TestingInjector.prototype),
        'resolveComponentHost',
      ).mockRejectedValue(new Error('Not found'));

      await expect(
        injector.resolveComponentHost({} as any, { name: 'TestName' } as any),
      ).rejects.toThrow('Not found');
    });

    it('should use mocker when super fails and mocker is set', async () => {
      vi.spyOn(
        Object.getPrototypeOf(TestingInjector.prototype),
        'resolveComponentHost',
      ).mockRejectedValue(new Error('Not found'));

      const mockInstance = { mocked: true };
      const mocker = vi.fn().mockReturnValue(mockInstance);
      injector.setMocker(mocker);

      const mockContainer = {
        getInternalCoreModuleRef: vi.fn().mockReturnValue({
          addCustomProvider: vi.fn(),
          addExportedProviderOrModule: vi.fn(),
          providers: new Map(),
        }),
      } as any;
      injector.setContainer(mockContainer);

      const result = await injector.resolveComponentHost(
        {} as any,
        { name: 'TestName', metatype: class {} as any, scope: 0 } as any,
      );

      expect(mocker).toHaveBeenCalledWith('TestName');
      expect(result.instance).toBe(mockInstance);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
