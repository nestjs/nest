import { ModuleCompiler } from '../../injector/compiler.js';
import { ByReferenceModuleOpaqueKeyFactory } from '../../injector/opaque-key-factory/by-reference-module-opaque-key-factory.js';

describe('ModuleCompiler', () => {
  let compiler: ModuleCompiler;
  beforeEach(() => {
    compiler = new ModuleCompiler(new ByReferenceModuleOpaqueKeyFactory());
  });

  describe('extractMetadata', () => {
    describe('when module is a dynamic module', () => {
      it('should return object with "type" and "dynamicMetadata" property', () => {
        const obj = { module: 'test', providers: [] };
        const { module, ...dynamicMetadata } = obj;
        expect(compiler.extractMetadata(obj as any)).toEqual({
          type: module,
          dynamicMetadata,
        });
      });
    });
    describe('when module is a not dynamic module', () => {
      it('should return object with "type" property', () => {
        const type = 'test';
        expect(compiler.extractMetadata(type as any)).toEqual({
          type,
          dynamicMetadata: undefined,
        });
      });
    });
  });

  describe('isDynamicModule', () => {
    describe('when module is a dynamic module', () => {
      it('should return true', () => {
        expect(compiler.isDynamicModule({ module: true } as any)).toBe(true);
      });
    });
    describe('when module is a dynamic module', () => {
      it('should return false', () => {
        expect(compiler.isDynamicModule({ x: true } as any)).toBe(false);
      });
    });
  });
});
