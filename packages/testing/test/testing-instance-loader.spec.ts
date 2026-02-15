import { TestingInstanceLoader } from '../testing-instance-loader.js';

describe('TestingInstanceLoader', () => {
  let loader: TestingInstanceLoader;
  let mockInjector: any;
  let mockContainer: any;

  beforeEach(() => {
    mockInjector = {
      setContainer: vi.fn(),
      setMocker: vi.fn(),
    };
    mockContainer = {
      getModules: vi.fn().mockReturnValue(new Map()),
    };

    // TestingInstanceLoader extends InstanceLoader<TestingInjector>
    // We create it with the required constructor args
    loader = new TestingInstanceLoader(
      mockContainer,
      mockInjector,
      {} as any, // graphInspector
    );

    // Mock super.createInstancesOfDependencies to avoid running the real loader
    vi.spyOn(
      Object.getPrototypeOf(TestingInstanceLoader.prototype),
      'createInstancesOfDependencies',
    ).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createInstancesOfDependencies', () => {
    it('should set the container on the injector', async () => {
      await loader.createInstancesOfDependencies();

      expect(mockInjector.setContainer).toHaveBeenCalledWith(mockContainer);
    });

    it('should not set mocker when none is provided', async () => {
      await loader.createInstancesOfDependencies();

      expect(mockInjector.setMocker).not.toHaveBeenCalled();
    });

    it('should set mocker when provided', async () => {
      const mocker = vi.fn();
      await loader.createInstancesOfDependencies(undefined, mocker);

      expect(mockInjector.setMocker).toHaveBeenCalledWith(mocker);
    });

    it('should call super.createInstancesOfDependencies', async () => {
      const superSpy = vi.spyOn(
        Object.getPrototypeOf(TestingInstanceLoader.prototype),
        'createInstancesOfDependencies',
      );

      await loader.createInstancesOfDependencies();

      expect(superSpy).toHaveBeenCalled();
    });

    it('should use default modules from container when none provided', async () => {
      const modules = new Map([['key', { id: 'mod1' }]]);
      mockContainer.getModules.mockReturnValue(modules);

      await loader.createInstancesOfDependencies();

      expect(mockContainer.getModules).toHaveBeenCalled();
    });
  });
});
