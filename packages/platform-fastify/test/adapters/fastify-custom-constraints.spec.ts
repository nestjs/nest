import { VersioningType } from '@nestjs/common';
import { FastifyAdapter } from '../../adapters/fastify-adapter.js';
import { FASTIFY_ROUTE_CONSTRAINTS_METADATA } from '../../constants.js';

describe('FastifyAdapter custom router constraints', () => {
  let adapter: FastifyAdapter;
  afterEach(async () => {
    await adapter?.getInstance().close();
  });

  const tenantStrategy = (header = 'x-tenant') => ({
    name: 'tenant',
    validate(value: unknown) {
      if (typeof value !== 'string')
        throw new TypeError('Tenant must be a string');
    },
    storage() {
      const values = new Map<string, unknown>();
      return {
        get: (key: string) => values.get(key) ?? null,
        set: (key: string, value: unknown) => values.set(key, value),
        del: (key: string) => values.delete(key),
        empty: () => values.clear(),
      };
    },
    deriveConstraint: request => request.headers[header],
    mustMatchWhenDerived: true,
  });

  const registerTenantRoute = (versioned = false) => {
    const handler = (_request, reply) => reply.send('ok');
    Reflect.defineMetadata(
      FASTIFY_ROUTE_CONSTRAINTS_METADATA,
      { tenant: 'a' },
      handler,
    );
    if (versioned)
      adapter.applyVersionFilter(handler, '1', {
        type: VersioningType.HEADER,
        header: 'x-version',
      });
    adapter.get('/tenant', handler);
  };

  it.each(['top-level', 'routerOptions'])(
    'keeps strategies passed in %s options',
    async location => {
      const constraints = { tenant: tenantStrategy() };
      adapter = new FastifyAdapter(
        location === 'routerOptions'
          ? { routerOptions: { constraints } }
          : { constraints },
      );
      registerTenantRoute();
      expect(
        (await adapter.inject({ url: '/tenant', headers: { 'x-tenant': 'a' } }))
          .statusCode,
      ).toBe(200);
      expect(
        (await adapter.inject({ url: '/tenant', headers: { 'x-tenant': 'b' } }))
          .statusCode,
      ).toBe(404);
    },
  );

  it('prefers routerOptions strategies over deprecated top-level ones', async () => {
    adapter = new FastifyAdapter({
      constraints: { tenant: tenantStrategy('x-old-tenant') },
      routerOptions: { constraints: { tenant: tenantStrategy() } },
    });
    registerTenantRoute();
    expect(
      (await adapter.inject({ url: '/tenant', headers: { 'x-tenant': 'a' } }))
        .statusCode,
    ).toBe(200);
  });

  it('keeps Nest versioning alongside a custom constraint', async () => {
    adapter = new FastifyAdapter({
      routerOptions: { constraints: { tenant: tenantStrategy() } },
    });
    registerTenantRoute(true);
    expect(
      (
        await adapter.inject({
          url: '/tenant',
          headers: { 'x-tenant': 'a', 'x-version': '1' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await adapter.inject({
          url: '/tenant',
          headers: { 'x-tenant': 'a', 'x-version': '2' },
        })
      ).statusCode,
    ).toBe(404);
  });
});
