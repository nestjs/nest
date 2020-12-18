import { expect } from 'chai';
import stringify from 'fast-safe-stringify';
import * as hash from 'object-hash';
import * as sinon from 'sinon';
import { ModuleTokenFactory } from '../../injector/module-token-factory';

describe('ModuleTokenFactory', () => {
  const moduleId = 'constId';
  let factory: ModuleTokenFactory;

  beforeEach(() => {
    factory = new ModuleTokenFactory();
    sinon.stub(factory, 'getModuleId').returns(moduleId);
  });
  describe('create', () => {
    class Module {}
    it('should return expected token', () => {
      const type = Module;
      const token = factory.create(type, undefined);
      expect(token).to.be.deep.eq(
        hash({
          id: moduleId,
          module: Module.name,
          dynamic: '',
        }),
      );
    });
    it('should include dynamic metadata', () => {
      const type = Module;
      const token = factory.create(type, {
        providers: [{}],
      } as any);

      expect(token).to.be.deep.eq(
        hash({
          id: moduleId,
          module: Module.name,
          dynamic: stringify({
            providers: [{}],
          }),
        }),
      );
    });
  });
  describe('getModuleName', () => {
    it('should map module metatype to name', () => {
      const metatype = () => {};
      expect(factory.getModuleName(metatype as any)).to.be.eql(metatype.name);
    });
  });
  describe('getDynamicMetadataToken', () => {
    describe('when metadata exists', () => {
      it('should return hash', () => {
        const metadata = { providers: ['', {}] };
        expect(factory.getDynamicMetadataToken(metadata as any)).to.be.eql(
          JSON.stringify(metadata),
        );
      });
      it('should return hash with class', () => {
        class Provider {}
        const metadata = { providers: [Provider], exports: [Provider] };
        expect(factory.getDynamicMetadataToken(metadata)).to.be.eql(
          '{"providers":["Provider"],"exports":["Provider"]}',
        );
      });
      it('should serialize symbols in a dynamic metadata object', () => {
        const metadata = {
          providers: [
            {
              provide: Symbol('a'),
              useValue: 'a',
            },
            {
              provide: Symbol('b'),
              useValue: 'b',
            },
          ],
        };

        expect(factory.getDynamicMetadataToken(metadata)).to.be.eql(
          '{"providers":[{"provide":"Symbol(a)","useValue":"a"},{"provide":"Symbol(b)","useValue":"b"}]}',
        );
      });
    });
    describe('when metadata does not exist', () => {
      it('should return empty string', () => {
        expect(factory.getDynamicMetadataToken(undefined)).to.be.eql('');
      });
    });
  });
});
