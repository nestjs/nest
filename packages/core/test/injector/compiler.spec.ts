import { expect } from 'chai';
import * as sinon from 'sinon';
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

  describe('resolveForwardReference', () => {
    it('should resolve a reference once and return the same module after', () => {
      class CatsModule {}
      const forwardRef = sinon.spy(() => ({ module: CatsModule }));
      const reference = { forwardRef };

      const first = compiler.resolveForwardReference(reference);
      expect(compiler.resolveForwardReference(reference)).to.equal(first);
      expect(forwardRef.calledOnce).to.be.true;
      expect(compiler.extractMetadata(reference)).to.deep.equal({
        type: CatsModule,
        dynamicMetadata: {},
      });
    });

    it('should not remember a reference that resolves to nothing yet', () => {
      class CatsModule {}
      let resolved: typeof CatsModule | undefined = undefined;
      const reference = { forwardRef: () => resolved };

      expect(compiler.resolveForwardReference(reference)).to.be.undefined;
      resolved = CatsModule;
      expect(compiler.resolveForwardReference(reference)).to.equal(CatsModule);
    });

    it('should give a reference the token of the module it resolves to', async () => {
      class CatsModule {}
      const dynamicModule = { module: CatsModule, providers: [] };
      const reference = { forwardRef: () => dynamicModule };

      expect((await compiler.compile(reference)).token).to.equal(
        (await compiler.compile(dynamicModule)).token,
      );
      expect(
        (await compiler.compile({ forwardRef: () => CatsModule })).token,
      ).to.equal((await compiler.compile(CatsModule)).token);
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
