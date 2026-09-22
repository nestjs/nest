import { FileInterceptor } from '../../../multipart/interceptors/file.interceptor.js';
import {
  MISSING_PLUGIN_MESSAGE,
  PLUGIN_NOT_REGISTERED_AT_STARTUP_MESSAGE,
  WRONG_ADAPTER_MESSAGE,
} from '../../../multipart/multipart/multipart.constants.js';

describe('upload interceptors (bootstrap checks)', () => {
  const createAdapterHost = (type: string, instance: any = {}) =>
    ({
      httpAdapter: { getType: () => type, getInstance: () => instance },
    }) as any;

  const createInstance = (hasPlugin: boolean) => {
    const hooks: Function[] = [];
    return {
      hooks,
      addHook: vi.fn((_name: string, hook: Function) => hooks.push(hook)),
      hasRequestDecorator: vi.fn(() => hasPlugin),
    };
  };

  it('should do nothing when no HTTP adapter is available', () => {
    const target = new (FileInterceptor('file'))({}, undefined);
    expect(() => target.onModuleInit!()).not.toThrow();
  });

  it('should reject a non-Fastify adapter', () => {
    const target = new (FileInterceptor('file'))(
      {},
      createAdapterHost('express'),
    );
    expect(() => target.onModuleInit!()).toThrow(WRONG_ADAPTER_MESSAGE);
  });

  it('should ask the FastifyAdapter to register the plugin', () => {
    const instance = createInstance(true);
    const adapterHost = createAdapterHost('fastify', instance);
    adapterHost.httpAdapter.useMultipart = vi.fn();
    new (FileInterceptor('file'))({}, adapterHost).onModuleInit!();
    expect(adapterHost.httpAdapter.useMultipart).toHaveBeenCalledOnce();
  });

  it('should fail the onReady hook when the plugin is missing', async () => {
    const instance = createInstance(false);
    const target = new (FileInterceptor('file'))(
      {},
      createAdapterHost('fastify', instance),
    );
    target.onModuleInit!();

    expect(instance.addHook).toHaveBeenCalledWith(
      'onReady',
      expect.any(Function),
    );
    await expect(instance.hooks[0]()).rejects.toThrow(MISSING_PLUGIN_MESSAGE);
  });

  it('should pass the onReady hook when the plugin is registered', async () => {
    const instance = createInstance(true);
    const target = new (FileInterceptor('file'))(
      {},
      createAdapterHost('fastify', instance),
    );
    target.onModuleInit!();
    await expect(instance.hooks[0]()).resolves.toBeUndefined();
  });

  it('should add the hook once per Fastify instance', () => {
    const instance = createInstance(true);
    const adapterHost = createAdapterHost('fastify', instance);
    new (FileInterceptor('a'))({}, adapterHost).onModuleInit!();
    new (FileInterceptor('b'))({}, adapterHost).onModuleInit!();
    expect(instance.addHook).toHaveBeenCalledTimes(1);
  });

  describe('when the instance has already booted (lazy-loaded modules)', () => {
    const createBootedInstance = (hasPlugin: boolean) => ({
      addHook: vi.fn(() => {
        throw new Error('Fastify instance is already listening');
      }),
      hasRequestDecorator: () => hasPlugin,
    });

    it('should fail right away when the plugin is missing', () => {
      const adapterHost = createAdapterHost(
        'fastify',
        createBootedInstance(false),
      );
      adapterHost.httpAdapter.useMultipart = vi.fn(() => {
        throw new Error('Root plugin has already booted');
      });
      const target = new (FileInterceptor('file'))({}, adapterHost);
      expect(() => target.onModuleInit!()).toThrow(
        PLUGIN_NOT_REGISTERED_AT_STARTUP_MESSAGE,
      );
      // Not remembered as verified: the next interceptor fails as well.
      expect(() =>
        new (FileInterceptor('other'))({}, adapterHost).onModuleInit!(),
      ).toThrow(PLUGIN_NOT_REGISTERED_AT_STARTUP_MESSAGE);
    });

    it('should pass when the plugin is registered', () => {
      const target = new (FileInterceptor('file'))(
        {},
        createAdapterHost('fastify', createBootedInstance(true)),
      );
      expect(() => target.onModuleInit!()).not.toThrow();
    });
  });

  it('should reject invalid limits, as multer does', () => {
    expect(
      () => new (FileInterceptor('file', { limits: { files: 1.5 } }))(),
    ).toThrow(
      new TypeError(
        'Expected limits.files to be a non-negative integer or Infinity',
      ),
    );
    expect(
      () => new (FileInterceptor('file'))({ limits: { parts: '2' as any } }),
    ).toThrow(TypeError);
    expect(
      () =>
        new (FileInterceptor('file', {
          limits: { fileSize: Infinity, files: undefined },
        }))(),
    ).not.toThrow();
  });
});
