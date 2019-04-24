import { expect } from 'chai';
import * as sinon from 'sinon';
import { MULTER_MODULE_ADAPTER, MULTER_MODULE_OPTIONS } from '../../constants';
import { MulterModule } from '../../multer.module';

describe('MulterModule', () => {
  describe('register', () => {
    it('should provide an options', () => {
      const options = {
        test: 'test',
      };

      const multer = { test: 'Fake Multer Instance' };

      const dynamicModule = MulterModule.register(options as any, multer);

      expect(dynamicModule.providers).to.have.length(2);
      expect(dynamicModule.imports).to.be.undefined;
      expect(dynamicModule.exports).to.include(MULTER_MODULE_OPTIONS);
      expect(dynamicModule.providers).to.deep.include({
        provide: MULTER_MODULE_OPTIONS,
        useValue: options,
      });
      expect(dynamicModule.providers).to.deep.include({
        provide: MULTER_MODULE_ADAPTER,
        useValue: multer,
      });
    });
  });

  describe('register async', () => {
    describe('when useFactory', () => {
      it('should provide an options', () => {
        const options: any = {};
        const multer = { test: 'Fake Multer Instance' };

        const asyncOptions = {
          useFactory: () => options,
        };
        const dynamicModule = MulterModule.registerAsync(asyncOptions, multer);

        expect(dynamicModule.providers).to.have.length(2);
        expect(dynamicModule.imports).to.be.undefined;
        expect(dynamicModule.exports).to.include(MULTER_MODULE_OPTIONS);
        expect(dynamicModule.providers).to.deep.include({
          provide: MULTER_MODULE_OPTIONS,
          useFactory: asyncOptions.useFactory,
          inject: [],
        });
        expect(dynamicModule.providers).to.deep.include({
          provide: MULTER_MODULE_ADAPTER,
          useValue: multer,
        });
      });
    });

    describe('when useExisting', () => {
      it('should provide an options', () => {
        const multer = { test: 'Fake Multer Instance' };
        const asyncOptions = {
          useExisting: Object,
        };
        const dynamicModule = MulterModule.registerAsync(
          asyncOptions as any,
          multer,
        );

        expect(dynamicModule.providers).to.have.length(2);
        expect(dynamicModule.imports).to.be.undefined;
        expect(dynamicModule.exports).to.include(MULTER_MODULE_OPTIONS);
        expect(dynamicModule.exports).to.include(MULTER_MODULE_ADAPTER);
        expect(dynamicModule.providers).to.deep.include({
          provide: MULTER_MODULE_ADAPTER,
          useValue: multer,
        });
      });
    });

    describe('when useClass', () => {
      it('should provide an options', () => {
        const multer = { test: 'Fake Multer Instance' };
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = MulterModule.registerAsync(
          asyncOptions as any,
          multer,
        );

        expect(dynamicModule.providers).to.have.length(3);
        expect(dynamicModule.imports).to.be.undefined;
        expect(dynamicModule.exports).to.include(MULTER_MODULE_OPTIONS);
        expect(dynamicModule.exports).to.include(MULTER_MODULE_ADAPTER);
        expect(dynamicModule.providers).to.deep.include({
          provide: MULTER_MODULE_ADAPTER,
          useValue: multer,
        });
      });

      it('provider should call "createMulterOptions"', async () => {
        const multer = { test: 'Fake Multer Instance' };
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = MulterModule.registerAsync(
          asyncOptions as any,
          multer,
        );
        const optionsFactory = {
          createMulterOptions: sinon.spy(),
        };
        await ((dynamicModule.providers[0] as any).useFactory as any)(
          optionsFactory,
        );
        expect(optionsFactory.createMulterOptions.called).to.be.true;
        expect(dynamicModule.providers).to.deep.include({
          provide: MULTER_MODULE_ADAPTER,
          useValue: multer,
        });
      });
    });
  });
});
