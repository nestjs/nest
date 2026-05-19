import {
  Logger,
  RequestMethod,
  VERSION_NEUTRAL,
  VersioningType,
  type RouteConflictPolicy,
  type VersioningOptions,
} from '@nestjs/common';
import { expect } from 'chai';
import { RouteConflictException } from '../../errors/exceptions/route-conflict.exception.js';
import { ResolvedRoute } from '../../router/interfaces/resolved-route.interface.js';
import { RouteConflictDetector } from '../../router/route-conflict-detector.js';

const makeResolvedRoute = (
  overrides: Partial<ResolvedRoute> & { path: string },
): ResolvedRoute => ({
  method: RequestMethod.GET,
  host: undefined,
  version: undefined,
  methodVersion: undefined,
  controllerVersion: undefined,
  handler: (() => undefined) as ResolvedRoute['handler'],
  targetCallback: (() => undefined) as ResolvedRoute['targetCallback'],
  methodName: 'findOne',
  instanceWrapper: {
    name: 'UsersController',
  } as ResolvedRoute['instanceWrapper'],
  ...overrides,
});

describe('RouteConflictDetector', () => {
  describe('tokenizePath', () => {
    it('should classify literal segments', () => {
      expect(RouteConflictDetector.tokenizePath('/users/me')).to.eql([
        { kind: 'literal', value: 'users' },
        { kind: 'literal', value: 'me' },
      ]);
    });

    it('should classify named param segments', () => {
      expect(RouteConflictDetector.tokenizePath('/users/:userId')).to.eql([
        { kind: 'literal', value: 'users' },
        { kind: 'param', value: 'userId' },
      ]);
    });

    it('should classify named wildcard segments', () => {
      expect(RouteConflictDetector.tokenizePath('/files/*path')).to.eql([
        { kind: 'literal', value: 'files' },
        { kind: 'wildcard', value: 'path' },
      ]);
    });

    it('should ignore leading and trailing slashes and empty segments', () => {
      expect(RouteConflictDetector.tokenizePath('//users//me/')).to.eql([
        { kind: 'literal', value: 'users' },
        { kind: 'literal', value: 'me' },
      ]);
    });
  });

  describe('pathsCanOverlap', () => {
    it('should return true for identical static paths', () => {
      expect(RouteConflictDetector.pathsCanOverlap('/users/me', '/users/me')).to
        .be.true;
    });

    it('should return false for different static paths of equal length', () => {
      expect(RouteConflictDetector.pathsCanOverlap('/users/me', '/users/admin'))
        .to.be.false;
    });

    it('should return true when a param can match a literal', () => {
      expect(
        RouteConflictDetector.pathsCanOverlap('/users/:userId', '/users/me'),
      ).to.be.true;
    });

    it('should return true for two parametric paths of the same shape', () => {
      expect(
        RouteConflictDetector.pathsCanOverlap('/users/:userId', '/users/:slug'),
      ).to.be.true;
    });

    it('should return false when segment counts differ and no wildcard absorbs', () => {
      expect(
        RouteConflictDetector.pathsCanOverlap(
          '/users/:userId',
          '/users/:userId/images/:imageId',
        ),
      ).to.be.false;
    });

    it('should return true when a trailing wildcard absorbs extra segments', () => {
      expect(
        RouteConflictDetector.pathsCanOverlap(
          '/files/*path',
          '/files/images/avatar.png',
        ),
      ).to.be.true;
    });

    it('should return false when the wildcard is on the longer side (named wildcard requires ≥1 segment)', () => {
      expect(RouteConflictDetector.pathsCanOverlap('/files/*path', '/files')).to
        .be.false;
      expect(RouteConflictDetector.pathsCanOverlap('/files', '/files/*path')).to
        .be.false;
    });

    it('should return false for URI-versioned paths because the version is in the path', () => {
      expect(
        RouteConflictDetector.pathsCanOverlap(
          '/api/users/me',
          '/api/v1/users/me',
        ),
      ).to.be.false;
    });
  });

  describe('detect', () => {
    it('should flag two identical routes as a duplicate', () => {
      const earlierRoute = makeResolvedRoute({ path: '/users/me' });
      const laterRoute = makeResolvedRoute({
        path: '/users/me',
        methodName: 'somethingElse',
      });

      const conflicts = RouteConflictDetector.detect(
        [earlierRoute, laterRoute],
        undefined,
      );

      expect(conflicts).to.have.lengthOf(1);
      expect(conflicts[0].kind).to.equal('duplicate');
      expect(conflicts[0].winner).to.equal(earlierRoute);
      expect(conflicts[0].shadowed).to.equal(laterRoute);
    });

    it('should flag overlapping but non-identical routes as a shadow', () => {
      const parametricRoute = makeResolvedRoute({ path: '/users/:userId' });
      const staticRoute = makeResolvedRoute({
        path: '/users/me',
        methodName: 'findMe',
      });

      const conflicts = RouteConflictDetector.detect(
        [parametricRoute, staticRoute],
        undefined,
      );

      expect(conflicts).to.have.lengthOf(1);
      expect(conflicts[0].kind).to.equal('shadow');
      expect(conflicts[0].winner).to.equal(parametricRoute);
      expect(conflicts[0].shadowed).to.equal(staticRoute);
    });

    it('should not flag routes on different HTTP methods', () => {
      const getRoute = makeResolvedRoute({
        path: '/users/:userId',
        method: RequestMethod.GET,
      });
      const postRoute = makeResolvedRoute({
        path: '/users/me',
        method: RequestMethod.POST,
      });

      const conflicts = RouteConflictDetector.detect(
        [getRoute, postRoute],
        undefined,
      );

      expect(conflicts).to.be.empty;
    });

    it('should not flag routes on different hosts', () => {
      const apiRoute = makeResolvedRoute({
        path: '/users/:userId',
        host: 'api.example.com',
      });
      const adminRoute = makeResolvedRoute({
        path: '/users/me',
        host: 'admin.example.com',
      });

      const conflicts = RouteConflictDetector.detect(
        [apiRoute, adminRoute],
        undefined,
      );

      expect(conflicts).to.be.empty;
    });

    it('should not flag routes on different versions when versioning is header-based', () => {
      const versioningOptions: VersioningOptions = {
        type: VersioningType.HEADER,
        header: 'Accept-Version',
      };
      const versionOneRoute = makeResolvedRoute({
        path: '/users/me',
        version: '1',
      });
      const versionTwoRoute = makeResolvedRoute({
        path: '/users/me',
        version: '2',
      });

      const conflicts = RouteConflictDetector.detect(
        [versionOneRoute, versionTwoRoute],
        versioningOptions,
      );

      expect(conflicts).to.be.empty;
    });

    it('should flag overlap as a shadow (not duplicate) when one of the two header-versioned routes is version-neutral', () => {
      const versioningOptions: VersioningOptions = {
        type: VersioningType.HEADER,
        header: 'Accept-Version',
      };
      const neutralRoute = makeResolvedRoute({
        path: '/users/me',
        version: VERSION_NEUTRAL,
      });
      const versionedRoute = makeResolvedRoute({
        path: '/users/me',
        version: '1',
      });

      const conflicts = RouteConflictDetector.detect(
        [neutralRoute, versionedRoute],
        versioningOptions,
      );

      expect(conflicts).to.have.lengthOf(1);
      // The tuples differ on `version` (VERSION_NEUTRAL vs '1'), so by
      // the documented "identical method+path+host+version" rule this
      // is a shadow, not a duplicate. `duplicate: 'error'` must not
      // reject this configuration.
      expect(conflicts[0].kind).to.equal('shadow');
    });

    it('should flag overlap as a shadow when a hostless route faces a host-specific route on the same path', () => {
      const hostlessRoute = makeResolvedRoute({ path: '/users/me' });
      const hostBoundRoute = makeResolvedRoute({
        path: '/users/me',
        host: 'api.example.com',
        methodName: 'meOnApi',
      });

      const conflicts = RouteConflictDetector.detect(
        [hostlessRoute, hostBoundRoute],
        undefined,
      );

      expect(conflicts).to.have.lengthOf(1);
      expect(conflicts[0].kind).to.equal('shadow');
    });

    it('should detect host-array overlap when arrays share a value (set membership, not stringified equality)', () => {
      const multiHostRoute = makeResolvedRoute({
        path: '/users/me',
        host: ['api.example.com', 'admin.example.com'],
      });
      const singleHostRoute = makeResolvedRoute({
        path: '/users/me',
        host: ['admin.example.com'],
        methodName: 'meOnAdmin',
      });

      const conflicts = RouteConflictDetector.detect(
        [multiHostRoute, singleHostRoute],
        undefined,
      );

      expect(conflicts).to.have.lengthOf(1);
      // Hosts overlap on 'admin.example.com' but are not identical
      // (different host sets), so this is a shadow.
      expect(conflicts[0].kind).to.equal('shadow');
    });

    it('should not flag host arrays with no shared value as overlapping', () => {
      const apiOnlyRoute = makeResolvedRoute({
        path: '/users/me',
        host: ['api.example.com'],
      });
      const adminOnlyRoute = makeResolvedRoute({
        path: '/users/me',
        host: ['admin.example.com'],
      });

      const conflicts = RouteConflictDetector.detect(
        [apiOnlyRoute, adminOnlyRoute],
        undefined,
      );

      expect(conflicts).to.be.empty;
    });

    it('should detect host overlap between a RegExp host and a string host the RegExp matches', () => {
      const regExpHostRoute = makeResolvedRoute({
        path: '/users/me',
        host: /\.example\.com$/,
      });
      const literalHostRoute = makeResolvedRoute({
        path: '/users/me',
        host: 'api.example.com',
        methodName: 'meOnApi',
      });

      const conflicts = RouteConflictDetector.detect(
        [regExpHostRoute, literalHostRoute],
        undefined,
      );

      expect(conflicts).to.have.lengthOf(1);
      expect(conflicts[0].kind).to.equal('shadow');
    });

    it('should classify identical host arrays declared in different order as a duplicate', () => {
      const earlierRoute = makeResolvedRoute({
        path: '/users/me',
        host: ['api.example.com', 'admin.example.com'],
      });
      const laterRoute = makeResolvedRoute({
        path: '/users/me',
        host: ['admin.example.com', 'api.example.com'],
        methodName: 'meAgain',
      });

      const conflicts = RouteConflictDetector.detect(
        [earlierRoute, laterRoute],
        undefined,
      );

      expect(conflicts).to.have.lengthOf(1);
      expect(conflicts[0].kind).to.equal('duplicate');
    });

    it('should compare across multiple routes only once per unique pair', () => {
      const firstRoute = makeResolvedRoute({ path: '/users/me' });
      const secondRoute = makeResolvedRoute({ path: '/users/me' });
      const thirdRoute = makeResolvedRoute({ path: '/users/me' });

      const conflicts = RouteConflictDetector.detect(
        [firstRoute, secondRoute, thirdRoute],
        undefined,
      );

      // pairs: (1,2), (1,3), (2,3) — three conflicts, not six.
      expect(conflicts).to.have.lengthOf(3);
    });
  });

  describe('handle', () => {
    let logger: Logger;
    let warnSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      logger = new Logger('test');
      warnSpy = vi
        .spyOn(logger, 'warn')
        .mockImplementation(() => undefined) as unknown as ReturnType<
        typeof vi.fn
      >;
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should do nothing when there are no conflicts', () => {
      RouteConflictDetector.handle(
        [],
        { duplicate: 'error', shadow: 'error' },
        logger,
      );
      expect(warnSpy.mock.calls).to.have.lengthOf(0);
    });

    it('should do nothing when policy is undefined', () => {
      const fakeConflict = {
        winner: makeResolvedRoute({ path: '/users/:userId' }),
        shadowed: makeResolvedRoute({ path: '/users/me' }),
        kind: 'shadow' as const,
      };

      RouteConflictDetector.handle([fakeConflict], undefined, logger);
      expect(warnSpy.mock.calls).to.have.lengthOf(0);
    });

    it('should warn once per shadow conflict when shadow policy is "warn"', () => {
      const policy: RouteConflictPolicy = { shadow: 'warn' };
      const fakeConflict = {
        winner: makeResolvedRoute({ path: '/users/:userId' }),
        shadowed: makeResolvedRoute({ path: '/users/me' }),
        kind: 'shadow' as const,
      };

      RouteConflictDetector.handle([fakeConflict], policy, logger);

      expect(warnSpy.mock.calls).to.have.lengthOf(1);
      const loggedMessage = warnSpy.mock.calls[0][0] as string;
      expect(loggedMessage).to.include('shadowed');
      expect(loggedMessage).to.include('/users/me');
      expect(loggedMessage).to.include('/users/:userId');
    });

    it('should remain silent when the matching kind is set to "off"', () => {
      const policy: RouteConflictPolicy = {
        duplicate: 'warn',
        shadow: 'off',
      };
      const fakeShadowConflict = {
        winner: makeResolvedRoute({ path: '/users/:userId' }),
        shadowed: makeResolvedRoute({ path: '/users/me' }),
        kind: 'shadow' as const,
      };

      RouteConflictDetector.handle([fakeShadowConflict], policy, logger);

      expect(warnSpy.mock.calls).to.have.lengthOf(0);
    });

    it('should throw a RouteConflictException when policy is "error"', () => {
      const policy: RouteConflictPolicy = { duplicate: 'error' };
      const fakeDuplicate = {
        winner: makeResolvedRoute({ path: '/users/me' }),
        shadowed: makeResolvedRoute({
          path: '/users/me',
          methodName: 'findMeAlias',
        }),
        kind: 'duplicate' as const,
      };

      expect(() =>
        RouteConflictDetector.handle([fakeDuplicate], policy, logger),
      ).to.throw(RouteConflictException, /Duplicate route/);
    });

    it('should aggregate every error-policy conflict into one exception', () => {
      const policy: RouteConflictPolicy = {
        duplicate: 'error',
        shadow: 'error',
      };
      const fakeDuplicate = {
        winner: makeResolvedRoute({ path: '/users/me' }),
        shadowed: makeResolvedRoute({
          path: '/users/me',
          methodName: 'findMeAlias',
        }),
        kind: 'duplicate' as const,
      };
      const fakeShadow = {
        winner: makeResolvedRoute({ path: '/users/:userId' }),
        shadowed: makeResolvedRoute({ path: '/users/admin' }),
        kind: 'shadow' as const,
      };

      let capturedError: RouteConflictException | undefined;
      try {
        RouteConflictDetector.handle(
          [fakeDuplicate, fakeShadow],
          policy,
          logger,
        );
      } catch (error) {
        capturedError = error as RouteConflictException;
      }

      expect(capturedError).to.be.instanceOf(RouteConflictException);
      expect(capturedError!.message).to.include('Duplicate route');
      expect(capturedError!.message).to.include('shadowed');
    });

    it('should mix warn and error policies when the kinds differ', () => {
      const policy: RouteConflictPolicy = {
        duplicate: 'error',
        shadow: 'warn',
      };
      const fakeShadow = {
        winner: makeResolvedRoute({ path: '/users/:userId' }),
        shadowed: makeResolvedRoute({ path: '/users/me' }),
        kind: 'shadow' as const,
      };
      const fakeDuplicate = {
        winner: makeResolvedRoute({ path: '/orders/:id' }),
        shadowed: makeResolvedRoute({
          path: '/orders/:id',
          methodName: 'sameAgain',
        }),
        kind: 'duplicate' as const,
      };

      expect(() =>
        RouteConflictDetector.handle(
          [fakeShadow, fakeDuplicate],
          policy,
          logger,
        ),
      ).to.throw(RouteConflictException, /Duplicate route/);
      expect(warnSpy.mock.calls).to.have.lengthOf(1);
    });
  });
});
