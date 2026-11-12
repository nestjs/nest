import { Logger, RequestMethod } from '@nestjs/common';
import { GlobalPrefixOptions } from '@nestjs/common/interfaces';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { ApplicationConfig } from '../application-config';
import { InvalidEnhancerException } from '../errors/exceptions/invalid-enhancer.exception';
import { ExcludeRouteMetadata } from '../router/interfaces/exclude-route-metadata.interface';

describe('ApplicationConfig', () => {
  let appConfig: ApplicationConfig;

  beforeEach(() => {
    appConfig = new ApplicationConfig();
  });
  describe('globalPath', () => {
    it('should set global path', () => {
      const path = 'test';
      appConfig.setGlobalPrefix(path);

      expect(appConfig.getGlobalPrefix()).to.be.eql(path);
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

      expect(appConfig.getGlobalPrefixOptions()).to.be.eql(options);
    });
    it('should has empty string as a global path by default', () => {
      expect(appConfig.getGlobalPrefix()).to.be.eql('');
    });
    it('should has empty string as a global path option by default', () => {
      expect(appConfig.getGlobalPrefixOptions()).to.be.eql({});
    });
  });
  describe('IOAdapter', () => {
    it('should set io adapter', () => {
      const ioAdapter = { test: 0 };
      appConfig.setIoAdapter(ioAdapter as any);

      expect(appConfig.getIoAdapter()).to.be.eql(ioAdapter);
    });
  });
  describe('Pipes', () => {
    it('should set global pipes', () => {
      const pipes = [{ transform: () => 1 }, { transform: () => 2 }];
      appConfig.useGlobalPipes(...pipes);

      expect(appConfig.getGlobalPipes()).to.be.eql(pipes);
    });
    it('should add pipe', () => {
      const pipe = 'testOne';
      appConfig.addGlobalPipe(pipe as any);

      expect(appConfig.getGlobalPipes()).to.contain(pipe);
    });
    it('should add global pipe', () => {
      const pipe = 'testOne';
      appConfig.addGlobalRequestPipe(pipe as any);

      expect(appConfig.getGlobalRequestPipes()).to.contain(pipe);
    });
  });
  describe('Filters', () => {
    it('should set global filters', () => {
      const filters = [{ catch: () => 1 }, { catch: () => 2 }];
      appConfig.useGlobalFilters(...filters);

      expect(appConfig.getGlobalFilters()).to.be.eql(filters);
    });
    it('should add filter', () => {
      const filter = 'testOne';
      appConfig.addGlobalFilter(filter as any);

      expect(appConfig.getGlobalFilters()).to.contain(filter);
    });
    it('should add request filter', () => {
      const filter = 'testOne';
      appConfig.addGlobalRequestFilter(filter as any);

      expect(appConfig.getGlobalRequestFilters()).to.contain(filter);
    });
  });
  describe('Guards', () => {
    it('should set global guards', () => {
      const guards = [
        { canActivate: () => true },
        { canActivate: () => false },
      ];
      appConfig.useGlobalGuards(...guards);

      expect(appConfig.getGlobalGuards()).to.be.eql(guards);
    });
    it('should add guard', () => {
      const guard = 'testOne';
      appConfig.addGlobalGuard(guard as any);

      expect(appConfig.getGlobalGuards()).to.contain(guard);
    });
    it('should add request guard', () => {
      const guard = 'testOne';
      appConfig.addGlobalRequestGuard(guard as any);

      expect(appConfig.getGlobalRequestGuards()).to.contain(guard);
    });
  });
  describe('when a global enhancer is not an instance', () => {
    class AuthGuard {
      canActivate() {
        return true;
      }
    }
    const cases: Array<[string, unknown, RegExp]> = [
      ['a class', AuthGuard, /\(class AuthGuard\)/],
      ['a promise', Promise.resolve(new AuthGuard()), /\(a promise\)/],
      ['an array', [new AuthGuard()], /\(an array\)/],
    ];
    cases.forEach(([description, guard, message]) => {
      it(`should throw when given ${description}`, () => {
        expect(() => appConfig.useGlobalGuards(guard as any)).to.throw(
          InvalidEnhancerException,
        );
        expect(() => appConfig.useGlobalGuards(guard as any)).to.throw(message);
        expect(appConfig.getGlobalGuards()).to.deep.equal([]);
      });
    });
    it('should throw for pipes and interceptors too', () => {
      class SomePipe {}
      expect(() => appConfig.useGlobalPipes(SomePipe as any)).to.throw(
        /The pipe \(class SomePipe\) doesn't provide the "transform" method/,
      );
      expect(() => appConfig.useGlobalInterceptors({} as any)).to.throw(
        /The interceptor \(an object\)/,
      );
    });
    it('should only warn for an exception filter', () => {
      const warn = sinon.stub(Logger.prototype, 'warn');
      class HttpExceptionFilter {
        catch() {}
      }
      try {
        appConfig.useGlobalFilters(HttpExceptionFilter as any);
        expect(warn.calledOnce).to.be.true;
        expect(warn.firstCall.args[0]).to.contain(
          'The exception filter (class HttpExceptionFilter)',
        );
        expect(appConfig.getGlobalFilters()).to.deep.equal([
          HttpExceptionFilter,
        ]);
      } finally {
        warn.restore();
      }
    });
    it('should accept a class that has the method as a static', () => {
      class StaticGuard {
        static canActivate() {
          return true;
        }
      }
      appConfig.useGlobalGuards(StaticGuard as any);
      expect(appConfig.getGlobalGuards()).to.deep.equal([StaticGuard]);
    });
  });
  describe('Interceptors', () => {
    it('should set global interceptors', () => {
      const interceptors = [{ intercept: () => 1 }, { intercept: () => 2 }];
      appConfig.useGlobalInterceptors(...(interceptors as any));

      expect(appConfig.getGlobalInterceptors()).to.be.eql(interceptors);
    });
    it('should add interceptor', () => {
      const interceptor = 'testOne';
      appConfig.addGlobalInterceptor(interceptor as any);

      expect(appConfig.getGlobalInterceptors()).to.contain(interceptor);
    });
    it('should add request interceptor', () => {
      const interceptor = 'testOne';
      appConfig.addGlobalRequestInterceptor(interceptor as any);

      expect(appConfig.getGlobalRequestInterceptors()).to.contain(interceptor);
    });
  });
  describe('Versioning', () => {
    it('should set versioning', () => {
      const options = { type: 'test' };
      appConfig.enableVersioning(options as any);

      expect(appConfig.getVersioning()).to.be.eql(options);
    });

    it('should ignore duplicated versions on defaultVersion array', () => {
      const options = { type: 'test', defaultVersion: ['1', '2', '2', '1'] };
      appConfig.enableVersioning(options as any);

      expect(appConfig.getVersioning()!.defaultVersion).to.be.eql(['1', '2']);
    });

    it('should have undefined as the versioning by default', () => {
      expect(appConfig.getVersioning()).to.be.eql(undefined);
    });
  });
});
