import { expect } from 'chai';
import { Version, VersioningType } from '../../../common';
import { MODULE_PATH } from '../../../common/constants';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import {
  Get,
  RequestMapping,
} from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { MiddlewareConfiguration } from '../../../common/interfaces';
import { ApplicationConfig } from '../../application-config';
import { NestContainer } from '../../injector/container';
import { Module } from '../../injector/module';
import { RoutesMapper } from '../../middleware/routes-mapper';

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

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[0])).to.deep.equal([
      { path: '/test', method: RequestMethod.GET },
    ]);

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).to.deep.equal([
      { path: '/versioned', version: '1', method: RequestMethod.GET },
    ]);

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[2])).to.deep.equal([
      { path: '/test/test', method: RequestMethod.GET },
      { path: '/test/another', method: RequestMethod.DELETE },
      { path: '/test/versioned', method: RequestMethod.GET, version: '1' },
    ]);
  });

  describe('when the controller is declared by more than one module', () => {
    let container: NestContainer;

    const declareIn = (modulePath?: string) => {
      class HostModule {}
      if (modulePath) {
        Reflect.defineMetadata(MODULE_PATH, modulePath, HostModule);
      }
      const moduleRef = new Module(HostModule, container);
      moduleRef.addController(TestRoute);
      container.getModules().set(`${modulePath}`, moduleRef);
    };

    beforeEach(() => {
      container = new NestContainer();
      const appConfig = new ApplicationConfig();
      appConfig.enableVersioning({ type: VersioningType.URI });
      mapper = new RoutesMapper(container, appConfig);
    });

    it('should map its routes under the path of each module', () => {
      declareIn('/first');
      declareIn('/second');
      declareIn();

      expect(
        mapper
          .mapRouteToRouteInfo(TestRoute)
          .filter(({ method }) => method === RequestMethod.DELETE),
      ).to.deep.equal([
        { path: '/first/test/another', method: RequestMethod.DELETE },
        { path: '/second/test/another', method: RequestMethod.DELETE },
        { path: '/test/another', method: RequestMethod.DELETE },
      ]);
    });

    it('should map its routes once for modules sharing a path', () => {
      declareIn('/');
      declareIn();

      expect(
        mapper
          .mapRouteToRouteInfo(TestRoute)
          .filter(({ method }) => method === RequestMethod.DELETE),
      ).to.deep.equal([
        { path: '/test/another', method: RequestMethod.DELETE },
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

    expect(mapper.mapRouteToRouteInfo(config.forRoutes[0])).to.deep.equal([
      { path: '/test', method: RequestMethod.GET },
    ]);
    expect(mapper.mapRouteToRouteInfo(config.forRoutes[1])).to.deep.equal([
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
    expect(mapper.mapRouteToRouteInfo(VersionedController)).to.deep.equal([
      { path: '/versioned/', version: '1', method: RequestMethod.GET },
      { path: '/versioned/override', version: '2', method: RequestMethod.GET },
    ]);
  });

  it('should map a versioned controller to the corresponding route info objects (multiple versions)', () => {
    expect(mapper.mapRouteToRouteInfo(MultipleVersionController)).to.deep.equal(
      [
        { path: '/multiple', version: '1', method: RequestMethod.GET },
        { path: '/multiple', version: '2', method: RequestMethod.GET },
      ],
    );
  });
});
