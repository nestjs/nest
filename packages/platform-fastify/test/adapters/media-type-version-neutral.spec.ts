import { VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { FastifyAdapter } from '../../adapters/fastify-adapter';

describe('FastifyAdapter media-type versioning (repro)', () => {
  let fastifyAdapter: FastifyAdapter;

  const registerNeutralRoute = (
    type: VersioningType.MEDIA_TYPE | VersioningType.HEADER,
  ) => {
    fastifyAdapter.initHttpServer();
    const handler = (_req: any, reply: any) =>
      fastifyAdapter.reply(reply, { ok: true }, 200);
    const versioningOptions: any =
      type === VersioningType.MEDIA_TYPE
        ? { type, key: 'v=' }
        : { type, header: 'X-API-Version' };
    const versionedHandler = fastifyAdapter.applyVersionFilter(
      handler,
      [VERSION_NEUTRAL, '2'] as any,
      versioningOptions,
    );
    fastifyAdapter.get('/neutral', versionedHandler);
  };

  afterEach(async () => {
    await fastifyAdapter.close();
  });

  it('MEDIA_TYPE: serves a [VERSION_NEUTRAL, "2"] route when Accept has no version', async () => {
    fastifyAdapter = new FastifyAdapter();
    registerNeutralRoute(VersioningType.MEDIA_TYPE);
    await fastifyAdapter.getInstance().ready();

    const res = await fastifyAdapter.inject({
      method: 'GET',
      url: '/neutral',
      headers: { accept: 'application/json' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('MEDIA_TYPE: serves a [VERSION_NEUTRAL, "2"] route when Accept is absent', async () => {
    fastifyAdapter = new FastifyAdapter();
    registerNeutralRoute(VersioningType.MEDIA_TYPE);
    await fastifyAdapter.getInstance().ready();

    const res = await fastifyAdapter.inject({
      method: 'GET',
      url: '/neutral',
    });
    expect(res.statusCode).toBe(200);
  });

  it('HEADER (peer control): serves a [VERSION_NEUTRAL, "2"] route when the version header is absent', async () => {
    fastifyAdapter = new FastifyAdapter();
    registerNeutralRoute(VersioningType.HEADER);
    await fastifyAdapter.getInstance().ready();

    const res = await fastifyAdapter.inject({
      method: 'GET',
      url: '/neutral',
    });
    expect(res.statusCode).toBe(200);
  });
});
