import { FactoryProvider } from '@nestjs/common';
import { MULTER_MODULE_OPTIONS } from '../../../multer/files.constants.js';
import { MulterModule } from '../../../multer/multer.module.js';

describe('MulterModule', () => {
  describe('register', () => {
    it('should provide an options', () => {
      const options = {
        test: 'test',
      };
      const dynamicModule = MulterModule.register(options as any);

      expect(dynamicModule.providers).toHaveLength(2);
      expect(dynamicModule.imports).toBeUndefined();
      expect(dynamicModule.exports).toContain(MULTER_MODULE_OPTIONS);

      const moduleOptionsProvider = dynamicModule.providers!.find(
        p => 'useFactory' in p && p.provide === MULTER_MODULE_OPTIONS,
      ) as FactoryProvider;
      expect(moduleOptionsProvider).not.toBeUndefined();
      expect(moduleOptionsProvider.useFactory()).toBe(options);
    });
  });

  describe('register async', () => {
    describe('when useFactory', () => {
      it('should provide an options', () => {
        const options: any = {};
        const asyncOptions = {
          useFactory: () => options,
        };
        const dynamicModule = MulterModule.registerAsync(asyncOptions);

        expect(dynamicModule.providers).toHaveLength(2);
        expect(dynamicModule.imports).toBeUndefined();
        expect(dynamicModule.exports).toContain(MULTER_MODULE_OPTIONS);
        expect(dynamicModule.providers).toContainEqual(
          expect.objectContaining({
            provide: MULTER_MODULE_OPTIONS,
            useFactory: asyncOptions.useFactory,
            inject: [],
          }),
        );
      });
    });

    describe('when useExisting', () => {
      it('should provide an options', () => {
        const asyncOptions = {
          useExisting: Object,
        };
        const dynamicModule = MulterModule.registerAsync(asyncOptions as any);

        expect(dynamicModule.providers).toHaveLength(2);
        expect(dynamicModule.imports).toBeUndefined();
        expect(dynamicModule.exports).toContain(MULTER_MODULE_OPTIONS);
      });
    });

    describe('when useClass', () => {
      it('should provide an options', () => {
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = MulterModule.registerAsync(asyncOptions as any);

        expect(dynamicModule.providers).toHaveLength(3);
        expect(dynamicModule.imports).toBeUndefined();
        expect(dynamicModule.exports).toContain(MULTER_MODULE_OPTIONS);
      });
      it('provider should call "createMulterOptions"', async () => {
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = MulterModule.registerAsync(asyncOptions as any);
        const optionsFactory = {
          createMulterOptions: vi.fn(),
        };
        await (dynamicModule.providers![0] as any).useFactory(optionsFactory);
        expect(optionsFactory.createMulterOptions).toHaveBeenCalled();
      });
    });
  });
});
