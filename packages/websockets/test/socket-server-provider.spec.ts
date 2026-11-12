import { ApplicationConfig } from '@nestjs/core/application-config.js';
import { AbstractWsAdapter } from '../adapters/ws-adapter.js';
import { SocketServerProvider } from '../socket-server-provider.js';
import { SocketsContainer } from '../sockets-container.js';

class NoopAdapter extends AbstractWsAdapter {
  public create(port: number, options?: any) {}
  public bindMessageHandlers(client: any, handlers) {}
}

describe('SocketServerProvider', () => {
  let instance: SocketServerProvider;
  let socketsContainer: SocketsContainer;

  beforeEach(() => {
    socketsContainer = new SocketsContainer();
    instance = new SocketServerProvider(
      socketsContainer,
      new ApplicationConfig(new NoopAdapter()),
    );
  });
  describe('scanForSocketServer', () => {
    let createSocketServerSpy: ReturnType<typeof vi.fn>;
    const path = 'localhost:3030';
    const port = 30;

    beforeEach(() => {
      createSocketServerSpy = vi.spyOn(instance, 'createSocketServer' as any);
    });

    it(`should return stored server`, () => {
      const server = { test: 'test' };
      vi.spyOn(socketsContainer, 'getOneByConfig').mockReturnValue(
        server as any,
      );

      const result = instance.scanForSocketServer({ namespace: null! }, port);

      expect(createSocketServerSpy).not.toHaveBeenCalled();
      expect(result).toBe(server);
    });

    it(`should call "createSocketServer" when server is not stored already`, () => {
      vi.spyOn(socketsContainer, 'getOneByConfig').mockReturnValue(null as any);

      instance.scanForSocketServer({ path }, port);
      expect(createSocketServerSpy).toHaveBeenCalled();
    });

    it(`should call "decorateWithNamespace" when namespace is specified`, () => {
      const decorateWithNamespaceSpy = vi.spyOn(
        instance,
        'decorateWithNamespace' as any,
      );

      instance.scanForSocketServer({ path, namespace: 'random' }, port);
      expect(decorateWithNamespaceSpy).toHaveBeenCalled();
    });

    describe('when namespace is specified and server does exist already', () => {
      it(`should call "decorateWithNamespace" and not call "createSocketServer"`, () => {
        const server = { test: 'test' };
        vi.spyOn(socketsContainer, 'getOneByConfig').mockReturnValue(
          server as any,
        );

        const decorateWithNamespaceSpy = vi.spyOn(
          instance,
          'decorateWithNamespace' as any,
        );

        instance.scanForSocketServer({ path, namespace: 'random' }, port);
        expect(decorateWithNamespaceSpy).toHaveBeenCalled();
        expect(createSocketServerSpy).not.toHaveBeenCalled();
      });
    });

    describe('when gateways are declared on the same namespace', () => {
      it(`should return the host stored for that namespace`, () => {
        const host = instance.scanForSocketServer(
          { path, namespace: 'random' },
          port,
        );

        expect(
          instance.scanForSocketServer({ path, namespace: 'random' }, port),
        ).toBe(host);
        expect(
          instance.scanForSocketServer({ path, namespace: '/random' }, port),
        ).toBe(host);
        expect(createSocketServerSpy).toHaveBeenCalledTimes(1);
      });

      it(`should create the server of a RegExp namespace once`, () => {
        const create = vi.spyOn(NoopAdapter.prototype, 'create');
        const host = instance.scanForSocketServer(
          { path, namespace: /^\/random-\d+$/ },
          port,
        );
        create.mockClear();

        expect(
          instance.scanForSocketServer(
            { path, namespace: /^\/random-\d+$/ },
            port,
          ),
        ).toBe(host);
        expect(create).not.toHaveBeenCalled();
      });

      it.each([
        ['declared first', true],
        ['declared second', false],
      ])(
        `should share the streams of the gateways without a namespace with a gateway on "/" %s`,
        (_, isNamespacedFirst) => {
          const scanRoot = () => instance.scanForSocketServer({ path }, port);
          const scanSlash = () =>
            instance.scanForSocketServer({ path, namespace: '/' }, port);
          const [slashHost, rootHost] = isNamespacedFirst
            ? [scanSlash(), scanRoot()]
            : [scanRoot(), scanSlash()].reverse();

          expect(slashHost).not.toBe(rootHost);
          expect(slashHost.connection).toBe(rootHost.connection);
          expect(slashHost.disconnect).toBe(rootHost.disconnect);
        },
      );

      it(`should not return the host of another namespace, path or port`, () => {
        const host = instance.scanForSocketServer(
          { path, namespace: 'random' },
          port,
        );

        expect(instance.scanForSocketServer({ path }, port)).not.toBe(host);
        expect(
          instance.scanForSocketServer({ path, namespace: 'other' }, port),
        ).not.toBe(host);
        expect(
          instance.scanForSocketServer({ path, namespace: /^\/random$/ }, port),
        ).not.toBe(host);
        expect(
          instance.scanForSocketServer(
            { path: 'localhost:3031', namespace: 'random' },
            port,
          ),
        ).not.toBe(host);
        expect(
          instance.scanForSocketServer({ path, namespace: 'random' }, port + 1),
        ).not.toBe(host);
      });
    });

    describe('when a gateway joins a server created for another one', () => {
      let logError: ReturnType<typeof vi.spyOn>;
      let logWarn: ReturnType<typeof vi.spyOn>;
      beforeEach(() => {
        logError = vi
          .spyOn(instance['logger'], 'error')
          .mockImplementation(() => undefined);
        logWarn = vi
          .spyOn(instance['logger'], 'warn')
          .mockImplementation(() => undefined);
      });

      it.each(['verifyClient', 'allowRequest'])(
        'should refuse a gateway whose "%s" the server would not run',
        key => {
          instance.scanForSocketServer({ path }, port, 'OpenGateway');

          expect(() =>
            instance.scanForSocketServer(
              { path, [key]: () => false },
              port,
              'CheckedGateway',
            ),
          ).toThrow(
            `The gateway CheckedGateway sets "${key}", but shares the server on port ${port} and the path "${path}" with a gateway declared before it, and the server runs no "${key}" of that gateway.`,
          );
          expect(logError).toHaveBeenCalledTimes(1);
        },
      );

      it('should refuse a gateway on a namespace with another "allowRequest"', () => {
        instance.scanForSocketServer(
          { path, namespace: 'a', allowRequest: () => true },
          port,
        );

        expect(() =>
          instance.scanForSocketServer(
            { path, namespace: 'b', allowRequest: () => false },
            port,
          ),
        ).toThrow(/runs the "allowRequest" of that gateway/);
      });

      it('should accept a gateway with the same connection check, or none', () => {
        const verifyClient = () => true;
        instance.scanForSocketServer({ path, verifyClient }, port);

        instance.scanForSocketServer({ path, verifyClient }, port);
        instance.scanForSocketServer({ path }, port);

        expect(logError).not.toHaveBeenCalled();
        expect(logWarn).not.toHaveBeenCalled();
      });

      it('should report other options the gateway would lose', () => {
        instance.scanForSocketServer(
          { path, namespace: 'a', cors: { origin: '*' } },
          port,
        );

        instance.scanForSocketServer(
          { path, namespace: 'b', cors: { origin: '*' } },
          port,
        );
        expect(logWarn).not.toHaveBeenCalled();

        instance.scanForSocketServer(
          { path, namespace: 'c', cors: { origin: 'x' }, transports: [] },
          port,
          'ChatGateway',
        );
        expect(logWarn).toHaveBeenCalledTimes(1);
        expect(logWarn.mock.calls[0][0]).toMatch(
          /^The gateway ChatGateway shares .* not applied: "cors", "transports"\.$/,
        );
      });
    });
  });

  describe('when there is no HTTP server', () => {
    class ListenerlessAdapter extends NoopAdapter {
      public createWithoutListener = vi.fn(() => ({ listenerless: true }));
    }
    let adapter: ListenerlessAdapter;
    let create: ReturnType<typeof vi.spyOn>;
    const providerFor = (config: ApplicationConfig, hasHttpServer = false) =>
      new SocketServerProvider(new SocketsContainer(), config, hasHttpServer);

    beforeEach(() => {
      adapter = new ListenerlessAdapter();
      create = vi.spyOn(adapter, 'create');
    });

    it('should create the server of a gateway without a port without a listener', () => {
      const provider = providerFor(new ApplicationConfig(adapter));
      const logSpy = vi
        .spyOn(provider['logger'], 'log')
        .mockImplementation(() => undefined);
      const verifyClient = () => true;

      const host = provider.scanForSocketServer(
        { path: '/live', verifyClient },
        0,
        'LiveGateway',
      );

      expect(host.server).toEqual({ listenerless: true });
      expect(adapter.createWithoutListener).toHaveBeenCalledWith({
        path: '/live',
        verifyClient,
      });
      expect(create).not.toHaveBeenCalled();
      expect(logSpy.mock.calls[0][0]).toMatch(
        /^LiveGateway has no port, and there is no HTTP server/,
      );
    });

    it('should create the server of a gateway with a port as before', () => {
      providerFor(new ApplicationConfig(adapter)).scanForSocketServer({}, 8080);

      expect(create).toHaveBeenCalledWith(8080, {});
      expect(adapter.createWithoutListener).not.toHaveBeenCalled();
    });

    it('should serve a gateway without a port on the HTTP server of the adapter', () => {
      const adapterWithServer = new ListenerlessAdapter({});
      const createOnServer = vi.spyOn(adapterWithServer, 'create');

      providerFor(new ApplicationConfig(adapterWithServer)).scanForSocketServer(
        {},
        0,
      );

      expect(createOnServer).toHaveBeenCalledWith(0, {});
      expect(adapterWithServer.createWithoutListener).not.toHaveBeenCalled();
    });

    it('should leave a gateway without a port to an adapter without "createWithoutListener"', () => {
      const noopAdapter = new NoopAdapter();
      const noopCreate = vi.spyOn(noopAdapter, 'create');

      providerFor(new ApplicationConfig(noopAdapter)).scanForSocketServer(
        {},
        0,
      );

      expect(noopCreate).toHaveBeenCalledWith(0, {});
    });

    it('should not use "createWithoutListener" in an application with an HTTP server', () => {
      providerFor(new ApplicationConfig(adapter), true).scanForSocketServer(
        {},
        0,
      );

      expect(create).toHaveBeenCalledWith(0, {});
      expect(adapter.createWithoutListener).not.toHaveBeenCalled();
    });
  });
});
