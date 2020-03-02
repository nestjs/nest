import { expect } from 'chai';
import * as sinon from 'sinon';
import { MULTER_MODULE_OPTIONS } from '../../../multer/files.constants';
import { MulterModule } from '../../../multer/multer.module';

describe('MulterModule', () => {
  describe('register', () => {
    it('should provide an options', () => {
      const options = {
        test: 'test',
      };
      const dynamicModule = MulterModule.register(options as any);

      expect(dynamicModule.providers).to.have.length(2);
      expect(dynamicModule.imports).to.be.undefined;
      expect(dynamicModule.exports).to.include(MULTER_MODULE_OPTIONS);
      expect(dynamicModule.providers).to.deep.include({
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

        expect(dynamicModule.providers).to.have.length(2);
        expect(dynamicModule.imports).to.be.undefined;
        expect(dynamicModule.exports).to.include(MULTER_MODULE_OPTIONS);
        expect(dynamicModule.providers).to.deep.include({
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

        expect(dynamicModule.providers).to.have.length(2);
        expect(dynamicModule.imports).to.be.undefined;
        expect(dynamicModule.exports).to.include(MULTER_MODULE_OPTIONS);
      });
    });

    describe('when useClass', () => {
      it('should provide an options', () => {
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = MulterModule.registerAsync(asyncOptions as any);

        expect(dynamicModule.providers).to.have.length(3);
        expect(dynamicModule.imports).to.be.undefined;
        expect(dynamicModule.exports).to.include(MULTER_MODULE_OPTIONS);
      });
      it('provider should call "createMulterOptions"', async () => {
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = MulterModule.registerAsync(asyncOptions as any);
        const optionsFactory = {
          createMulterOptions: sinon.spy(),
        };
        await ((dynamicModule.providers[0] as any).useFactory as any)(
          optionsFactory,
        );
        expect(optionsFactory.createMulterOptions.called).to.be.true;
      });
    });
  });
});
