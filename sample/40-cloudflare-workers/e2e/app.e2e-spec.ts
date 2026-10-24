import { unstable_dev, type Unstable_DevWorker } from 'wrangler';
import type { Cat } from '../src/cats/interfaces/cat.interface.js';

// Runs the built Worker ("npm run build") in workerd, the runtime of
// Cloudflare Workers, with a local KV namespace
describe('Nest on Cloudflare Workers', () => {
  let worker: Unstable_DevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('dist/worker.js', {
      config: 'wrangler.jsonc',
      persist: false,
      logLevel: 'error',
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker?.stop();
  });

  it('should read the bindings', async () => {
    const response = await worker.fetch('/');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      message: 'Hello from Nest on Cloudflare Workers',
    });
  });

  it('should store cats in KV', async () => {
    const created = await worker.fetch('/cats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Tom', age: 3, breed: 'Tabby' }),
    });
    expect(created.status).toBe(201);
    const cat = (await created.json()) as Cat;

    const found = await worker.fetch(`/cats/${cat.id}`);
    const all = await worker.fetch('/cats');

    expect(await found.json()).toEqual(cat);
    expect(await all.json()).toContainEqual(cat);
  });

  it('should validate the body', async () => {
    const response = await worker.fetch('/cats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Tom', age: -1 }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: expect.arrayContaining(['age must not be less than 0']),
    });
  });

  it('should answer with exceptions', async () => {
    const malformed = await worker.fetch('/cats/not-a-uuid');
    const missing = await worker.fetch(
      '/cats/00000000-0000-4000-8000-000000000000',
    );
    const unknown = await worker.fetch('/unknown');

    expect(malformed.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(unknown.status).toBe(404);
  });

  it('should answer preflight requests', async () => {
    const response = await worker.fetch('/cats', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://example.com',
        'access-control-request-method': 'POST',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('should stream Server-Sent Events', async () => {
    const response = await worker.fetch('/ticks');

    expect(response.headers.get('content-type')).toBe('text/event-stream');
    const body = await response.text();
    expect(body).toContain('data: {"tick":0}');
    expect(body).toContain('data: {"tick":2}');
  });
});
