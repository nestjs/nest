import { RequestMethod } from '@nestjs/common';
import { GlobalPrefixOptions } from '@nestjs/common/interfaces/index.js';
import { ApplicationConfig } from '../application-config.js';
import { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface.js';
import { InvalidEnhancerException } from '../errors/exceptions/invalid-enhancer.exception.js';

describe('ApplicationConfig', () => {
  let appConfig: ApplicationConfig;

  beforeEach(() => {
    appConfig = new ApplicationConfig();
  });
  describe('globalPath', () => {
    it('should set global path', () => {
      const path = 'test';
      appConfig.setGlobalPrefix(path);

      expect(appConfig.getGlobalPrefix()).toEqual(path);
    });
    it('should set global path options', () => {
      const options: GlobalPrefixOptions<ExcludeRouteMetadata> = {
        exclude: [
          {
            path: '/health',
            pathRegex: new RegExp(/health/),
            requestMethod: RequestMethod.GET,
          },
        ],
      };
      appConfig.setGlobalPrefixOptions(options);

      expect(appConfig.getGlobalPrefixOptions()).toEqual(options);
    });
    it('should has empty string as a global path by default', () => {
      expect(appConfig.getGlobalPrefix()).toEqual('');
    });
    it('should has empty string as a global path option by default', () => {
      expect(appConfig.getGlobalPrefixOptions()).toEqual({});
    });
  });
  describe('IOAdapter', () => {
    it('should set io adapter', () => {
      const ioAdapter = { test: 0 };
      appConfig.setIoAdapter(ioAdapter as any);

      expect(appConfig.getIoAdapter()).toEqual(ioAdapter);
    });
  });
  describe('Pipes', () => {
    it('should set global pipes', () => {
      const pipes = [{ transform: () => 1 }, { transform: () => 2 }];
      appConfig.useGlobalPipes(...pipes);

      expect(appConfig.getGlobalPipes()).toEqual(pipes);
    });
    it('should add pipe', () => {
      const pipe = 'testOne';
      appConfig.addGlobalPipe(pipe as any);

      expect(appConfig.getGlobalPipes()).toContain(pipe);
    });
    it('should add global pipe', () => {
      const pipe = 'testOne';
      appConfig.addGlobalRequestPipe(pipe as any);

      expect(appConfig.getGlobalRequestPipes()).toContain(pipe);
    });
  });
  describe('Filters', () => {
    it('should set global filters', () => {
      const filters = ['test', 'test2'];
      appConfig.useGlobalFilters(...(filters as any));

      expect(appConfig.getGlobalFilters()).toEqual(filters);
    });
    it('should add filter', () => {
      const filter = 'testOne';
      appConfig.addGlobalFilter(filter as any);

      expect(appConfig.getGlobalFilters()).toContain(filter);
    });
    it('should add request filter', () => {
      const filter = 'testOne';
      appConfig.addGlobalRequestFilter(filter as any);

      expect(appConfig.getGlobalRequestFilters()).toContain(filter);
    });
  });
  describe('Guards', () => {
    it('should set global guards', () => {
      const guards = [
        { canActivate: () => true },
        { canActivate: () => false },
      ];
      appConfig.useGlobalGuards(...guards);

      expect(appConfig.getGlobalGuards()).toEqual(guards);
    });
    it('should add guard', () => {
      const guard = 'testOne';
      appConfig.addGlobalGuard(guard as any);

      expect(appConfig.getGlobalGuards()).toContain(guard);
    });
    it('should add request guard', () => {
      const guard = 'testOne';
      appConfig.addGlobalRequestGuard(guard as any);

      expect(appConfig.getGlobalRequestGuards()).toContain(guard);
    });
  });
  describe('when a global enhancer is not an instance', () => {
    class AuthGuard {
      canActivate() {
        return true;
      }
    }
    it.each([
      ['a class', AuthGuard, /\(class AuthGuard\)/],
      ['a promise', Promise.resolve(new AuthGuard()), /\(a promise\)/],
      ['an array', [new AuthGuard()], /\(an array\)/],
    ])('should throw when given %s', (_, guard, message) => {
      expect(() => appConfig.useGlobalGuards(guard as any)).toThrow(
        InvalidEnhancerException,
      );
      expect(() => appConfig.useGlobalGuards(guard as any)).toThrow(message);
      expect(appConfig.getGlobalGuards()).toEqual([]);
    });
    it('should throw for pipes and interceptors too', () => {
      class SomePipe {}
      expect(() => appConfig.useGlobalPipes(SomePipe as any)).toThrow(
        /The pipe \(class SomePipe\) doesn't provide the "transform" method/,
      );
      expect(() => appConfig.useGlobalInterceptors({} as any)).toThrow(
        /The interceptor \(an object\)/,
      );
    });
    it('should accept a class that has the method as a static', () => {
      class StaticGuard {
        static canActivate() {
          return true;
        }
      }
      appConfig.useGlobalGuards(StaticGuard as any);
      expect(appConfig.getGlobalGuards()).toEqual([StaticGuard]);
    });
  });
  describe('PreRequestHooks', () => {
    it('should set global preRequest hooks', () => {
      const hooks = [() => {}, () => {}];
      appConfig.registerPreRequestHook(...(hooks as any));

      expect(appConfig.getGlobalPreRequestHooks()).toEqual(hooks);
    });
    it('should accumulate multiple registerPreRequestHook calls', () => {
      const hook1 = () => {};
      const hook2 = () => {};
      appConfig.registerPreRequestHook(hook1 as any);
      appConfig.registerPreRequestHook(hook2 as any);

      expect(appConfig.getGlobalPreRequestHooks()).toEqual([hook1, hook2]);
    });
  });
  describe('Interceptors', () => {
    it('should set global interceptors', () => {
      const interceptors = [{ intercept: () => 1 }, { intercept: () => 2 }];
      appConfig.useGlobalInterceptors(...(interceptors as any));

      expect(appConfig.getGlobalInterceptors()).toEqual(interceptors);
    });
    it('should add interceptor', () => {
      const interceptor = 'testOne';
      appConfig.addGlobalInterceptor(interceptor as any);

      expect(appConfig.getGlobalInterceptors()).toContain(interceptor);
    });
    it('should add request interceptor', () => {
      const interceptor = 'testOne';
      appConfig.addGlobalRequestInterceptor(interceptor as any);

      expect(appConfig.getGlobalRequestInterceptors()).toContain(interceptor);
    });
  });
  describe('Versioning', () => {
    it('should set versioning', () => {
      const options = { type: 'test' };
      appConfig.enableVersioning(options as any);

      expect(appConfig.getVersioning()).toEqual(options);
    });

    it('should ignore duplicated versions on defaultVersion array', () => {
      const options = { type: 'test', defaultVersion: ['1', '2', '2', '1'] };
      appConfig.enableVersioning(options as any);

      expect(appConfig.getVersioning()!.defaultVersion).toEqual(['1', '2']);
    });

    it('should have undefined as the versioning by default', () => {
      expect(appConfig.getVersioning()).toEqual(undefined);
    });

    it('should keep scalar defaultVersion unchanged', () => {
      const options = { type: 'test', defaultVersion: '1' };
      appConfig.enableVersioning(options as any);

      expect(appConfig.getVersioning()!.defaultVersion).toEqual('1');
    });
  });

  describe('constructor', () => {
    it('should accept an ioAdapter argument', () => {
      const ioAdapter = { test: true } as any;
      const config = new ApplicationConfig(ioAdapter);

      expect(config.getIoAdapter()).toBe(ioAdapter);
    });

    it('should default ioAdapter to null', () => {
      const config = new ApplicationConfig();

      expect(config.getIoAdapter()).toBeNull();
    });
  });

  describe('accumulation', () => {
    it('should accumulate global pipes via useGlobalPipes and addGlobalPipe', () => {
      const pipes = [1, 2, 3].map(() => ({ transform: () => null }));
      appConfig.useGlobalPipes(pipes[0], pipes[1]);
      appConfig.addGlobalPipe(pipes[2]);

      expect(appConfig.getGlobalPipes()).toEqual(pipes);
    });

    it('should accumulate global filters via useGlobalFilters and addGlobalFilter', () => {
      appConfig.useGlobalFilters('f1' as any);
      appConfig.addGlobalFilter('f2' as any);

      expect(appConfig.getGlobalFilters()).toEqual(['f1', 'f2']);
    });

    it('should accumulate global guards via useGlobalGuards and addGlobalGuard', () => {
      const guards = [1, 2].map(() => ({ canActivate: () => true }));
      appConfig.useGlobalGuards(guards[0]);
      appConfig.addGlobalGuard(guards[1]);

      expect(appConfig.getGlobalGuards()).toEqual(guards);
    });

    it('should accumulate global interceptors via useGlobalInterceptors and addGlobalInterceptor', () => {
      const interceptors = [1, 2].map(() => ({ intercept: () => null }));
      appConfig.useGlobalInterceptors(...(interceptors as any[]).slice(0, 1));
      appConfig.addGlobalInterceptor(interceptors[1] as any);

      expect(appConfig.getGlobalInterceptors()).toEqual(interceptors);
    });
  });
  describe('Route conflict policy', () => {
    it('should default to undefined', () => {
      expect(appConfig.getRouteConflictPolicy()).toEqual(undefined);
    });

    it('should store the provided policy', () => {
      const policy = { duplicate: 'error', shadow: 'warn' } as const;
      appConfig.setRouteConflictPolicy(policy);

      expect(appConfig.getRouteConflictPolicy()).toEqual(policy);
    });

    it('should reset to undefined when explicitly cleared', () => {
      appConfig.setRouteConflictPolicy({ duplicate: 'warn' });
      appConfig.setRouteConflictPolicy(undefined);

      expect(appConfig.getRouteConflictPolicy()).toEqual(undefined);
    });
  });

  describe('Route resolution strategy', () => {
    it('should default to undefined', () => {
      expect(appConfig.getRouteResolutionStrategy()).toEqual(undefined);
    });

    it('should store the provided strategy', () => {
      appConfig.setRouteResolutionStrategy('specificity');

      expect(appConfig.getRouteResolutionStrategy()).toEqual('specificity');
    });

    it('should reset to undefined when explicitly cleared', () => {
      appConfig.setRouteResolutionStrategy('specificity');
      appConfig.setRouteResolutionStrategy(undefined);

      expect(appConfig.getRouteResolutionStrategy()).toEqual(undefined);
    });
  });
});
