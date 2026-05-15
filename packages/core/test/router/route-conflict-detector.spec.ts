import { RequestMethod, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { expect } from 'chai';
import {
  RouteConflictDetector,
  RouteConflictEntry,
  isRouteConflictDetectionCompatibleAdapter,
} from '../../router/route-conflict-detector';

describe('RouteConflictDetector', () => {
  const createRoute = (
    path: string,
    overrides: Partial<RouteConflictEntry> = {},
  ): RouteConflictEntry => ({
    path,
    normalizedPath: path,
    requestMethod: RequestMethod.GET,
    className: 'TestController',
    methodName: 'handler',
    moduleKey: 'test',
    ...overrides,
  });

  it('should detect a static route shadowed by an earlier parameter route', () => {
    const detector = new RouteConflictDetector();
    detector.register(
      createRoute('/users/:id', {
        methodName: 'findOne',
      }),
    );

    const conflicts = detector.register(
      createRoute('/users/me', {
        methodName: 'findMe',
      }),
    );

    expect(conflicts).to.have.length(1);
    expect(conflicts[0].message).to.contain(
      'GET /users/:id (TestController.findOne) may shadow GET /users/me (TestController.findMe)',
    );
  });

  it('should not detect a conflict when the static route is registered first', () => {
    const detector = new RouteConflictDetector();
    detector.register(createRoute('/users/me'));

    const conflicts = detector.register(createRoute('/users/:id'));

    expect(conflicts).to.be.empty;
  });

  it('should detect a route shadowed by an earlier wildcard route', () => {
    const detector = new RouteConflictDetector();
    detector.register(createRoute('/users/*path'));

    const conflicts = detector.register(createRoute('/users/me'));

    expect(conflicts).to.have.length(1);
  });

  it('should detect duplicate routes', () => {
    const detector = new RouteConflictDetector();
    detector.register(createRoute('/users/me'));

    const conflicts = detector.register(createRoute('/users/me'));

    expect(conflicts).to.have.length(1);
  });

  it('should ignore disjoint request methods', () => {
    const detector = new RouteConflictDetector();
    detector.register(createRoute('/users/:id'));

    const conflicts = detector.register(
      createRoute('/users/me', {
        requestMethod: RequestMethod.POST,
      }),
    );

    expect(conflicts).to.be.empty;
  });

  it('should match RequestMethod.ALL with specific request methods', () => {
    const detector = new RouteConflictDetector();
    detector.register(
      createRoute('/users/:id', {
        requestMethod: RequestMethod.ALL,
      }),
    );

    const conflicts = detector.register(createRoute('/users/me'));

    expect(conflicts).to.have.length(1);
  });

  it('should ignore disjoint hosts', () => {
    const detector = new RouteConflictDetector();
    detector.register(
      createRoute('/users/:id', {
        host: 'api.example.com',
      }),
    );

    const conflicts = detector.register(
      createRoute('/users/me', {
        host: 'admin.example.com',
      }),
    );

    expect(conflicts).to.be.empty;
  });

  it('should detect conflicts for matching hosts', () => {
    const detector = new RouteConflictDetector();
    detector.register(
      createRoute('/users/:id', {
        host: 'api.example.com',
      }),
    );

    const conflicts = detector.register(
      createRoute('/users/me', {
        host: 'api.example.com',
      }),
    );

    expect(conflicts).to.have.length(1);
  });

  it('should ignore disjoint non-URI versions', () => {
    const detector = new RouteConflictDetector();
    const versioningOptions = {
      type: VersioningType.HEADER,
      header: 'x-version',
    } as const;
    detector.register(
      createRoute('/users/:id', {
        version: '1',
        versioningOptions,
      }),
    );

    const conflicts = detector.register(
      createRoute('/users/me', {
        version: '2',
        versioningOptions,
      }),
    );

    expect(conflicts).to.be.empty;
  });

  it('should treat VERSION_NEUTRAL as compatible with all versions', () => {
    const detector = new RouteConflictDetector();
    const versioningOptions = {
      type: VersioningType.HEADER,
      header: 'x-version',
    } as const;
    detector.register(
      createRoute('/users/:id', {
        version: VERSION_NEUTRAL,
        versioningOptions,
      }),
    );

    const conflicts = detector.register(
      createRoute('/users/me', {
        version: '2',
        versioningOptions,
      }),
    );

    expect(conflicts).to.have.length(1);
  });

  it('should treat URI versions as path-based conflicts', () => {
    const detector = new RouteConflictDetector();
    const versioningOptions = {
      type: VersioningType.URI,
    } as const;
    detector.register(
      createRoute('/v1/users/:id', {
        version: '1',
        versioningOptions,
      }),
    );

    const conflicts = detector.register(
      createRoute('/v2/users/me', {
        version: '2',
        versioningOptions,
      }),
    );

    expect(conflicts).to.be.empty;
  });

  it('should skip Fastify adapters', () => {
    expect(
      isRouteConflictDetectionCompatibleAdapter({
        getType: () => 'fastify',
      }),
    ).to.be.false;
  });

  it('should allow Express and custom adapters', () => {
    expect(
      isRouteConflictDetectionCompatibleAdapter({
        getType: () => 'express',
      }),
    ).to.be.true;
    expect(isRouteConflictDetectionCompatibleAdapter({})).to.be.true;
  });
});
