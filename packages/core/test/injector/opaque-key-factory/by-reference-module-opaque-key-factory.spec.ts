import { ByReferenceModuleOpaqueKeyFactory } from '../../../injector/opaque-key-factory/by-reference-module-opaque-key-factory.js';

describe('ByReferenceModuleOpaqueKeyFactory', () => {
  const moduleId = 'constId';
  let factory: ByReferenceModuleOpaqueKeyFactory;

  describe('when generating algorithm is random', () => {
    beforeEach(() => {
      factory = new ByReferenceModuleOpaqueKeyFactory();
      vi.spyOn(factory as any, 'generateRandomString').mockReturnValue(
        moduleId,
      );
    });

    describe('createForStatic', () => {
      class Module {}

      it('should return expected token', () => {
        const type = Module;
        const token1 = factory.createForStatic(type);
        const token2 = factory.createForStatic(type);
        expect(token1).toEqual(token2);
      });
    });

    describe('createForDynamic', () => {
      class Module {}

      it('should include dynamic metadata', () => {
        const dynamicModule = {
          module: Module,
          providers: [
            {
              provide: 'test',
              useValue: 'test',
            },
          ],
        };
        const token1 = factory.createForDynamic(
          dynamicModule.module,
          {
            providers: dynamicModule.providers,
          },
          dynamicModule,
        );
        const token2 = factory.createForDynamic(
          dynamicModule.module,
          {
            providers: dynamicModule.providers,
          },
          dynamicModule,
        );

        expect(token1).toEqual(token2);
      });
    });
  });
  describe('when generating algorithm is shallow', () => {
    beforeEach(() => {
      factory = new ByReferenceModuleOpaqueKeyFactory({
        keyGenerationStrategy: 'shallow',
      });
      vi.spyOn(factory as any, 'generateRandomString').mockReturnValue(
        moduleId,
      );
    });

    describe('createForStatic', () => {
      class Module {}

      it('should return expected token', () => {
        const type = Module;
        const token1 = factory.createForStatic(type);
        const token2 = factory.createForStatic(type);

        expect(token1).toEqual(token2);
      });
    });

    describe('createForDynamic', () => {
      class Module {}

      it('should include dynamic metadata', () => {
        const dynamicModule = {
          module: Module,
          providers: [
            {
              provide: 'test',
              useValue: 'test',
            },
          ],
        };

        const token1 = factory.createForDynamic(
          dynamicModule.module,
          {
            providers: dynamicModule.providers,
          },
          dynamicModule,
        );
        const token2 = factory.createForDynamic(
          dynamicModule.module,
          {
            providers: dynamicModule.providers,
          },
          dynamicModule,
        );

        expect(token1).toEqual(token2);
      });
    });
  });
});
