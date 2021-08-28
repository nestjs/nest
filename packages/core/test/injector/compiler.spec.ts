import { ModuleCompiler } from '../../injector/compiler';

describe('ModuleCompiler', () => {
  let compiler: ModuleCompiler;
  beforeEach(() => {
    compiler = new ModuleCompiler();
  });

  describe('extractMetadata', () => {
    describe('when module is a dynamic module', () => {
      it('should return object with "type" and "dynamicMetadata" property', async () => {
        const obj = { module: 'test', providers: [] };
        const { module, ...dynamicMetadata } = obj;
        expect(await compiler.extractMetadata(obj as any)).toEqual({
          type: module,
          dynamicMetadata,
        });
      });
    });
    describe('when module is a not dynamic module', () => {
      it('should return object with "type" property', async () => {
        const type = 'test';
        expect(await compiler.extractMetadata(type as any)).toEqual({
          type,
        });
      });
    });
  });

  describe('isDynamicModule', () => {
    describe('when module is a dynamic module', () => {
      it('should return true', () => {
        expect(compiler.isDynamicModule({ module: true } as any)).toBeTruthy();
      });
    });
    describe('when module is a dynamic module', () => {
      it('should return false', () => {
        expect(compiler.isDynamicModule({ x: true } as any)).toBeFalsy();
      });
    });
  });
});
