import { pathToRegexp } from 'path-to-regexp';
import { LegacyRouteConverter } from '../../router/legacy-route-converter.js';

describe('LegacyRouteConverter', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi
      .spyOn(LegacyRouteConverter['logger'], 'warn')
      .mockImplementation(() => {});
    errorSpy = vi
      .spyOn(LegacyRouteConverter['logger'], 'error')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tryConvert', () => {
    describe('(.*) wildcard', () => {
      it('should convert trailing (.*) to {*path}', () => {
        expect(LegacyRouteConverter.tryConvert('/users/(.*)')).toBe(
          '/users/{*path}',
        );
      });

      it('should not print warning for root-level /(.*)', () => {
        LegacyRouteConverter.tryConvert('/(.*)', { logs: true });
        expect(warnSpy).not.toHaveBeenCalled();
      });

      it('should print warning for non-root (.*)', () => {
        LegacyRouteConverter.tryConvert('/users/(.*)', { logs: true });
        expect(warnSpy).toHaveBeenCalled();
      });

      it('should convert (.*) without leading slash', () => {
        expect(LegacyRouteConverter.tryConvert('users/(.*)')).toBe(
          'users/{*path}',
        );
      });
    });

    describe('* wildcard', () => {
      it('should convert trailing * to {*path}', () => {
        expect(LegacyRouteConverter.tryConvert('/users/*')).toBe(
          '/users/{*path}',
        );
      });

      it('should not print warning for root-level /*', () => {
        LegacyRouteConverter.tryConvert('/*', { logs: true });
        expect(warnSpy).not.toHaveBeenCalled();
      });

      it('should print warning for non-root *', () => {
        LegacyRouteConverter.tryConvert('/users/*', { logs: true });
        expect(warnSpy).toHaveBeenCalled();
      });
    });

    describe('+ wildcard', () => {
      it('should convert /+ to /*path', () => {
        expect(LegacyRouteConverter.tryConvert('/users/+')).toBe(
          '/users/*path',
        );
      });

      it('should print warning for + wildcard', () => {
        LegacyRouteConverter.tryConvert('/users/+', { logs: true });
        expect(warnSpy).toHaveBeenCalled();
      });
    });

    describe('mid-path wildcards', () => {
      it('should convert mid-path * segments to named params', () => {
        const result = LegacyRouteConverter.tryConvert('/a/*/b');
        expect(result).toContain('/*path');
        expect(result).toContain('/b');
      });

      it('should print warning for mid-path wildcards', () => {
        LegacyRouteConverter.tryConvert('/a/*/b', { logs: true });
        expect(warnSpy).toHaveBeenCalled();
      });
    });

    describe('routes with more than one wildcard', () => {
      it('should convert both the mid-path and the trailing wildcard', () => {
        expect(LegacyRouteConverter.tryConvert('/a/*/b/*')).toBe(
          '/a/*path2/b/{*path}',
        );
        expect(LegacyRouteConverter.tryConvert('/a/(.*)/b/(.*)')).toBe(
          '/a/*path2/b/{*path}',
        );
      });

      it('should convert a mid-path (.*) segment', () => {
        expect(LegacyRouteConverter.tryConvert('/a/(.*)/b')).toBe(
          '/a/*path2/b',
        );
      });

      it('should return routes that path-to-regexp accepts', () => {
        const routes = [
          '/a/*/b/*',
          '/a/*/b/*/c/*',
          '/a/(.*)/b/(.*)',
          '/a/*/b/(.*)',
          '/a/(.*)/b/*',
          '/a/+/b/+',
        ];

        for (const route of routes) {
          const convertedRoute = LegacyRouteConverter.tryConvert(route);
          expect(() => pathToRegexp(convertedRoute)).not.toThrow();
        }
      });
    });

    describe('no-op routes', () => {
      it('should return route unchanged when no wildcards present', () => {
        expect(LegacyRouteConverter.tryConvert('/users/:id')).toBe(
          '/users/:id',
        );
      });

      it('should return empty route unchanged', () => {
        expect(LegacyRouteConverter.tryConvert('/')).toBe('/');
      });

      it('should return already-valid wildcard routes unchanged', () => {
        expect(LegacyRouteConverter.tryConvert('/users/{*path}')).toBe(
          '/users/{*path}',
        );
      });
    });

    describe('logs option', () => {
      it('should suppress warnings when logs is false', () => {
        LegacyRouteConverter.tryConvert('/users/*', { logs: false });
        expect(warnSpy).not.toHaveBeenCalled();
      });

      it('should print warnings by default', () => {
        LegacyRouteConverter.tryConvert('/users/*');
        expect(warnSpy).toHaveBeenCalled();
      });
    });
  });

  describe('printError', () => {
    it('should log an error message with the route', () => {
      LegacyRouteConverter.printError('/users/*');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported route path'),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('/users/*'),
      );
    });
  });

  describe('printWarning', () => {
    it('should log a warning message with auto-convert note', () => {
      LegacyRouteConverter.printWarning('/users/*');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempting to auto-convert'),
      );
    });
  });
});
