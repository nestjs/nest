import type { FactoryProvider } from '@nestjs/common';
import { MULTIPART_MODULE_OPTIONS } from '../../multipart/files.constants.js';
import { MultipartModule } from '../../multipart/multipart.module.js';

describe('MultipartModule', () => {
  describe('register', () => {
    it('should provide the options', () => {
      const options = { dest: '/tmp' };
      const dynamicModule = MultipartModule.register(options);

      expect(dynamicModule.providers).toHaveLength(2);
      expect(dynamicModule.imports).toBeUndefined();
      expect(dynamicModule.exports).toContain(MULTIPART_MODULE_OPTIONS);

      const optionsProvider = dynamicModule.providers!.find(
        p => 'useFactory' in p && p.provide === MULTIPART_MODULE_OPTIONS,
      ) as FactoryProvider;
      expect(optionsProvider.useFactory()).toBe(options);
    });
  });

  describe('registerAsync', () => {
    it('should provide the options from useFactory', () => {
      const asyncOptions = { useFactory: () => ({}), inject: ['X'] };
      const dynamicModule = MultipartModule.registerAsync(asyncOptions);

      expect(dynamicModule.providers).toHaveLength(2);
      expect(dynamicModule.exports).toContain(MULTIPART_MODULE_OPTIONS);
      expect(dynamicModule.providers).toContainEqual(
        expect.objectContaining({
          provide: MULTIPART_MODULE_OPTIONS,
          useFactory: asyncOptions.useFactory,
          inject: ['X'],
        }),
      );
    });

    it('should provide the options from useExisting', () => {
      const dynamicModule = MultipartModule.registerAsync({
        useExisting: Object as any,
      });
      expect(dynamicModule.providers).toHaveLength(2);
    });

    it('should register the class and call "createMultipartOptions" for useClass', async () => {
      const dynamicModule = MultipartModule.registerAsync({
        useClass: Object as any,
      });
      expect(dynamicModule.providers).toHaveLength(3);

      const optionsFactory = { createMultipartOptions: vi.fn(() => ({})) };
      await (dynamicModule.providers![0] as any).useFactory(optionsFactory);
      expect(optionsFactory.createMultipartOptions).toHaveBeenCalled();
    });

    it('should pass through imports', () => {
      class ConfigModule {}
      const dynamicModule = MultipartModule.registerAsync({
        imports: [ConfigModule],
        useFactory: () => ({}),
      });
      expect(dynamicModule.imports).toEqual([ConfigModule]);
    });
  });
});
