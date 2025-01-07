import { expect } from 'chai';
import { ModuleCompiler } from '../../injector/compiler';
import { ByReferenceModuleOpaqueKeyFactory } from '../../injector/opaque-key-factory/by-reference-module-opaque-key-factory';

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
        expect(compiler.extractMetadata(obj as any)).to.be.deep.equal({
          type: module,
          dynamicMetadata,
        });
      });
    });
    describe('when module is a not dynamic module', () => {
      it('should return object with "type" property', () => {
        const type = 'test';
        expect(compiler.extractMetadata(type as any)).to.be.deep.equal({
          type,
          dynamicMetadata: undefined,
        });
      });
    });
  });

  describe('isDynamicModule', () => {
    describe('when module is a dynamic module', () => {
      it('should return true', () => {
        expect(compiler.isDynamicModule({ module: true } as any)).to.be.true;
      });
    });
    describe('when module is a dynamic module', () => {
      it('should return false', () => {
        expect(compiler.isDynamicModule({ x: true } as any)).to.be.false;
      });
    });
  });
});
