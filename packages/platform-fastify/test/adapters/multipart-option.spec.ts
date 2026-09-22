import multipart from '@fastify/multipart';
import * as internal from '@nestjs/common/internal';
import { FastifyAdapter } from '../../adapters/fastify-adapter.js';

describe('FastifyAdapter and @fastify/multipart', () => {
  let adapter: FastifyAdapter;
  const isRegistered = () =>
    adapter.getInstance().hasRequestDecorator('isMultipart');
  const boot = async () => {
    await adapter.init();
    await adapter.getInstance().ready();
  };

  afterEach(async () => {
    vi.restoreAllMocks();
    await adapter?.close();
  });

  describe('by default', () => {
    it('should not register the plugin when nothing asks for it', async () => {
      adapter = new FastifyAdapter();
      await boot();
      expect(isRegistered()).toBe(false);
    });

    it('should register the plugin once useMultipart() is called', async () => {
      adapter = new FastifyAdapter();
      await adapter.init();
      adapter.useMultipart();
      adapter.useMultipart();
      await adapter.getInstance().ready();

      expect(isRegistered()).toBe(true);
      expect(
        adapter.getInstance().hasContentTypeParser('multipart/form-data'),
      ).toBe(true);
    });

    it('should skip the plugin when it was registered on the instance first', async () => {
      adapter = new FastifyAdapter();
      void adapter.getInstance().register(multipart);
      await adapter.init();
      adapter.useMultipart();
      // Would throw FST_ERR_DEC_ALREADY_PRESENT if registered twice.
      await adapter.getInstance().ready();
      expect(isRegistered()).toBe(true);
    });

    it.each([
      ['before', true],
      ['after', false],
    ])(
      'should own a registration through register() %s init',
      async (_, before) => {
        adapter = new FastifyAdapter();
        if (before) {
          adapter.register(multipart, { limits: { fileSize: 8 } });
        }
        await adapter.init();
        adapter.useMultipart();
        if (!before) {
          adapter.register(multipart, { limits: { fileSize: 8 } });
        }
        // Would throw FST_ERR_DEC_ALREADY_PRESENT if registered twice.
        await adapter.getInstance().ready();

        expect(isRegistered()).toBe(true);
        expect((adapter as any).multipartOptions).toEqual({
          limits: { fileSize: 8 },
        });
      },
    );

    it('should fail at startup, naming the package, when it is not installed', async () => {
      vi.spyOn(internal, 'tryLoadPackage').mockResolvedValue(null);
      const exit = vi.spyOn(process, 'exit');
      adapter = new FastifyAdapter();
      await adapter.init();
      adapter.useMultipart();

      await expect(adapter.getInstance().ready()).rejects.toThrow(
        'The "@fastify/multipart" package is missing. Please, make sure to install it (npm i @fastify/multipart)',
      );
      expect(exit).not.toHaveBeenCalled();
    });
  });

  describe('with the "multipart" option', () => {
    it('should register the plugin on init when set to true', async () => {
      adapter = new FastifyAdapter({ multipart: true });
      await boot();
      expect(isRegistered()).toBe(true);
    });

    it('should pass the plugin options', async () => {
      adapter = new FastifyAdapter({ multipart: { limits: { fileSize: 8 } } });
      const register = vi.spyOn(adapter.getInstance(), 'register');
      await boot();

      const call = register.mock.calls.find(([, opts]) => opts);
      expect(call?.[1]).toMatchObject({ limits: { fileSize: 8 } });
    });

    it('should register the plugin even when middie is skipped', async () => {
      adapter = new FastifyAdapter({ multipart: true, skipMiddie: true });
      await boot();
      expect(isRegistered()).toBe(true);
    });

    it('should never register the plugin when set to false', async () => {
      adapter = new FastifyAdapter({ multipart: false });
      await adapter.init();
      adapter.useMultipart();
      await adapter.getInstance().ready();
      expect(isRegistered()).toBe(false);
    });

    it('should leave register() alone when set to false', async () => {
      adapter = new FastifyAdapter({ multipart: false });
      adapter.register(multipart);
      await boot();
      expect(isRegistered()).toBe(true);
    });
  });
});
