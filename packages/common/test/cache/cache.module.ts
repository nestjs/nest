import { expect } from 'chai';
import { CACHE_MODULE_OPTIONS } from '../../cache/cache.constants';
import { CacheModule } from './../../cache/cache.module';

describe('CacheModule', () => {
  describe('register', () => {
    it('should provide an options', () => {
      const options = {
        test: 'test',
      };
      const dynamicModule = CacheModule.register(options as any);

      expect(dynamicModule.providers).to.have.length(1);
      expect(dynamicModule.imports).to.be.empty;
      expect(dynamicModule.exports).to.contain(CACHE_MODULE_OPTIONS);
      expect(dynamicModule.providers).to.contain({
        provide: CACHE_MODULE_OPTIONS,
        useValue: options,
      });
    });
  });

  describe('register async', () => {
    describe('when useFactory', () => {
      it('should provide an options', () => {
        const options: any = {};
        const asyncOptions = {
          useFactory: () => options,
        };
        const dynamicModule = CacheModule.registerAsync(asyncOptions);

        expect(dynamicModule.providers).to.have.length(1);
        expect(dynamicModule.imports).to.be.empty;
        expect(dynamicModule.exports).to.contain(CACHE_MODULE_OPTIONS);
        expect(dynamicModule.providers).to.contain({
          provide: CACHE_MODULE_OPTIONS,
          useFactory: asyncOptions.useFactory,
          inject: [],
        });
      });
    });

    describe('when useExisting', () => {
      it('should provide an options', () => {
        const asyncOptions = {
          useExisting: Object,
        };
        const dynamicModule = CacheModule.registerAsync(asyncOptions as any);

        expect(dynamicModule.providers).to.have.length(1);
        expect(dynamicModule.imports).to.be.empty;
        expect(dynamicModule.exports).to.contain(CACHE_MODULE_OPTIONS);
      });
    });

    describe('when useClass', () => {
      it('should provide an options', () => {
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = CacheModule.registerAsync(asyncOptions as any);

        expect(dynamicModule.providers).to.have.length(2);
        expect(dynamicModule.imports).to.be.empty;
        expect(dynamicModule.exports).to.contain(CACHE_MODULE_OPTIONS);
      });
    });
  });
});
