import { expect } from 'chai';
import { MULTER_MODULE_OPTIONS } from '../../files/files.constants';
import { MulterModule } from '../../files/multer.module';

describe('MulterModule', () => {
  describe('register', () => {
    it('should provide an options', () => {
      const options = {
        test: 'test',
      };
      const dynamicModule = MulterModule.register(options as any);

      expect(dynamicModule.providers).to.have.length(1);
      expect(dynamicModule.imports).to.be.empty;
      expect(dynamicModule.exports).to.contain(MULTER_MODULE_OPTIONS);
      expect(dynamicModule.providers).to.contain({
        provide: MULTER_MODULE_OPTIONS,
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
        const dynamicModule = MulterModule.registerAsync(asyncOptions);

        expect(dynamicModule.providers).to.have.length(1);
        expect(dynamicModule.imports).to.be.empty;
        expect(dynamicModule.exports).to.contain(MULTER_MODULE_OPTIONS);
        expect(dynamicModule.providers).to.contain({
          provide: MULTER_MODULE_OPTIONS,
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
        const dynamicModule = MulterModule.registerAsync(asyncOptions as any);

        expect(dynamicModule.providers).to.have.length(1);
        expect(dynamicModule.imports).to.be.empty;
        expect(dynamicModule.exports).to.contain(MULTER_MODULE_OPTIONS);
      });
    });

    describe('when useClass', () => {
      it('should provide an options', () => {
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = MulterModule.registerAsync(asyncOptions as any);

        expect(dynamicModule.providers).to.have.length(2);
        expect(dynamicModule.imports).to.be.empty;
        expect(dynamicModule.exports).to.contain(MULTER_MODULE_OPTIONS);
      });
    });
  });
});
