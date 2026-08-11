import { expect } from 'chai';
import { fastifyMiddie } from '../../adapters/middie/fastify-middie';

describe('@fastify/middie', () => {
  it('keeps inherited middleware paths stable across nested prefixes', () => {
    const hooks: Record<string, Function> = {};
    const root: any = {
      prefix: '',
      initialConfig: {
        caseSensitive: true,
        ignoreDuplicateSlashes: false,
        ignoreTrailingSlash: false,
      },
      decorate(name: string, value: unknown) {
        this[name] = value;
        return this;
      },
      addHook(name: string, hook: Function) {
        hooks[name] = hook;
        this[name] = hook;
        return this;
      },
    };

    fastifyMiddie(root, {}, () => undefined);

    let middlewareCalls = 0;
    root.use('/my-prefix', (_req: unknown, _res: unknown, next: Function) => {
      middlewareCalls += 1;
      next();
    });

    const child: any = {
      prefix: '/my-prefix',
      initialConfig: root.initialConfig,
      decorate(name: string, value: unknown) {
        this[name] = value;
        return this;
      },
      addHook(name: string, hook: Function) {
        this[name] = hook;
        return this;
      },
    };

    Object.setPrototypeOf(child, root);
    hooks.onRegister(child);

    let requestFinished = false;
    child.onRequest(
      {
        body: undefined,
        id: 'test-id',
        hostname: 'localhost',
        ip: '127.0.0.1',
        ips: [],
        log: {},
        method: 'GET',
        query: {},
        raw: { url: '/my-prefix/queues', method: 'GET' },
        url: '/my-prefix/queues',
      },
      {
        finished: false,
        raw: {},
        writableEnded: false,
      },
      () => {
        requestFinished = true;
      },
    );

    expect(middlewareCalls).to.equal(1);
    expect(requestFinished).to.equal(true);

    const grandchild: any = {
      prefix: '/my-prefix/nested',
      initialConfig: root.initialConfig,
      decorate(name: string, value: unknown) {
        this[name] = value;
        return this;
      },
      addHook(name: string, hook: Function) {
        this[name] = hook;
        return this;
      },
    };

    Object.setPrototypeOf(grandchild, child);
    hooks.onRegister(grandchild);

    let grandchildFinished = false;
    grandchild.onRequest(
      {
        body: undefined,
        id: 'test-id-2',
        hostname: 'localhost',
        ip: '127.0.0.1',
        ips: [],
        log: {},
        method: 'GET',
        query: {},
        raw: { url: '/my-prefix/nested/queues', method: 'GET' },
        url: '/my-prefix/nested/queues',
      },
      {
        finished: false,
        raw: {},
        writableEnded: false,
      },
      () => {
        grandchildFinished = true;
      },
    );

    expect(middlewareCalls).to.equal(2);
    expect(grandchildFinished).to.equal(true);
  });
});
