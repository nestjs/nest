import { MODULE_PATH } from '../../../common/constants.js';
import { Version, VersioningType } from '../../../common/index.js';
import { Controller } from '../../../common/decorators/core/controller.decorator.js';
import {
  Get,
  RequestMapping,
} from '../../../common/decorators/http/request-mapping.decorator.js';
import { RequestMethod } from '../../../common/enums/request-method.enum.js';
import { MiddlewareConfiguration } from '../../../common/interfaces/index.js';
import { ApplicationConfig } from '../../application-config.js';
import { NestContainer } from '../../injector/container.js';
import { RoutesMapper } from '../../middleware/routes-mapper.js';

describe('RoutesMapper', () => {
  @Controller('test')
  class TestRoute {
    @RequestMapping({ path: 'test' })
    public getTest() {}

    @RequestMapping({ path: 'another', method: RequestMethod.DELETE })
    public getAnother() {}

    @Version('1')
    @Get('versioned')
    public getVersioned() {}
  }

  let mapper: RoutesMapper;
  beforeEach(() => {
    const appConfig = new ApplicationConfig();
    appConfig.enableVersioning({ type: VersioningType.URI });
    mapper = new RoutesMapper(new NestContainer(), appConfig);
  });

  it('should map @Controller() to "ControllerMetadata" in forRoutes', () => {
    const config: MiddlewareConfiguration = {
      middleware: 'Test',
      forRoutes: [
        { path: 'test', method: RequestMethod.GET },
        { path: 'versioned', version: '1', method: RequestMethod.GET },
        TestRoute,
      ],
    };

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[0])).toEqual([
      { path: '/test', method: RequestMethod.GET },
    ]);

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).toEqual([
      { path: '/versioned', version: '1', method: RequestMethod.GET },
    ]);

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[2])).toEqual([
      { path: '/test/test', method: RequestMethod.GET },
      { path: '/test/another', method: RequestMethod.DELETE },
      { path: '/test/versioned', method: RequestMethod.GET, version: '1' },
    ]);
  });

  describe('when joining a controller path', () => {
    @Controller('tail/')
    class TrailingSlashRoute {
      @Get('child')
      public getChild() {}
    }

    const mountAt = (modulePath: string) => {
      class RoutedModule {}
      Reflect.defineMetadata(MODULE_PATH, modulePath, RoutedModule);
      vi.spyOn(mapper as any, 'getHostModuleOfController').mockReturnValue({
        metatype: RoutedModule,
      });
    };

    afterEach(() => vi.restoreAllMocks());

    it('should not double the slash after a controller path ending in a slash', () => {
      expect(mapper.mapRouteToRouteInfo(TrailingSlashRoute)).toEqual([
        { path: '/tail/child', method: RequestMethod.GET },
      ]);
    });

    it.each([
      { modulePath: '/', expected: '/test/test' },
      { modulePath: '/parent', expected: '/parent/test/test' },
    ])(
      'should join the module path $modulePath without a double slash',
      ({ modulePath, expected }) => {
        mountAt(modulePath);
        expect(mapper.mapRouteToRouteInfo(TestRoute)[0]).toEqual({
          path: expected,
          method: RequestMethod.GET,
        });
      },
    );

    it('should join a module path with a controller path ending in a slash', () => {
      mountAt('/parent');
      expect(mapper.mapRouteToRouteInfo(TrailingSlashRoute)).toEqual([
        { path: '/parent/tail/child', method: RequestMethod.GET },
      ]);
    });
  });

  @Controller(['test', 'test2'])
  class TestRouteWithMultiplePaths {
    @RequestMapping({ path: 'test' })
    public getTest() {}

    @RequestMapping({ path: 'another', method: RequestMethod.DELETE })
    public getAnother() {}
  }

  it('should map a controller with multiple paths to "ControllerMetadata" in forRoutes', () => {
    const config = {
      middleware: 'Test',
      forRoutes: [
        { path: 'test', method: RequestMethod.GET },
        TestRouteWithMultiplePaths,
      ],
    };

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[0])).toEqual([
      { path: '/test', method: RequestMethod.GET },
    ]);
    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).toEqual([
      { path: '/test/test', method: RequestMethod.GET },
      { path: '/test/another', method: RequestMethod.DELETE },
      { path: '/test2/test', method: RequestMethod.GET },
      { path: '/test2/another', method: RequestMethod.DELETE },
    ]);
  });

  @Controller({
    version: '1',
    path: 'versioned',
  })
  class VersionedController {
    @Get()
    hello() {
      return 'Hello from "VersionedController"!';
    }

    @Version('2')
    @Get('/override')
    override() {
      return 'Hello from "VersionedController"!';
    }
  }

  @Controller({
    version: ['1', '2'],
  })
  class MultipleVersionController {
    @Get('multiple')
    multiple() {
      return 'Multiple Versions 1 or 2';
    }
  }

  it('should map a versioned controller to the corresponding route info objects (single version)', () => {
    expect(mapper.mapRouteToRouteInfo(VersionedController)).toEqual([
      { path: '/versioned/', version: '1', method: RequestMethod.GET },
      { path: '/versioned/override', version: '2', method: RequestMethod.GET },
    ]);
  });

  it('should map a versioned controller to the corresponding route info objects (multiple versions)', () => {
    expect(mapper.mapRouteToRouteInfo(MultipleVersionController)).toEqual([
      { path: '/multiple', version: '1', method: RequestMethod.GET },
      { path: '/multiple', version: '2', method: RequestMethod.GET },
    ]);
  });
});
