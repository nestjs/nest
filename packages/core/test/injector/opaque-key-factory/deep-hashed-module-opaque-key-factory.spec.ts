import { expect } from 'chai';
import * as sinon from 'sinon';
import { DeepHashedModuleOpaqueKeyFactory } from '../../../injector/opaque-key-factory/deep-hashed-module-opaque-key-factory';

describe('DeepHashedModuleOpaqueKeyFactory', () => {
  const moduleId = 'constId';
  let factory: DeepHashedModuleOpaqueKeyFactory;

  beforeEach(() => {
    factory = new DeepHashedModuleOpaqueKeyFactory();
    sinon.stub(factory, 'getModuleId').returns(moduleId);
  });
  describe('createForStatic', () => {
    class Module {}

    it('should return expected token', () => {
      const type = Module;
      const token1 = factory.createForStatic(type);
      const token2 = factory.createForStatic(type);
      expect(token1).to.be.deep.eq(token2);
    });
  });
  describe('createForDynamic', () => {
    class Module {}

    it('should include dynamic metadata', () => {
      const type = Module;
      const token1 = factory.createForDynamic(type, {
        providers: [{}],
      } as any);
      const token2 = factory.createForDynamic(type, {
        providers: [{}],
      } as any);

      expect(token1).to.be.deep.eq(token2);
    });
  });

  describe('getModuleName', () => {
    it('should map module metatype to name', () => {
      const metatype = () => {};
      expect(factory.getModuleName(metatype as any)).to.be.eql(metatype.name);
    });
  });

  describe('getStringifiedOpaqueToken', () => {
    describe('when metadata exists', () => {
      it('should return hash', () => {
        const metadata = { providers: ['', {}] };
        expect(factory.getStringifiedOpaqueToken(metadata as any)).to.be.eql(
          JSON.stringify(metadata),
        );
      });
      it('should return hash with class', () => {
        class Provider {}
        const metadata = { providers: [Provider], exports: [Provider] };
        expect(factory.getStringifiedOpaqueToken(metadata)).to.be.eql(
          '{"providers":["Provider"],"exports":["Provider"]}',
        );
      });
      it('should return hash with value provider with non-class function', () => {
        const provider = {
          provide: 'ProvideValue',
          useValue: function Provider() {},
        };
        const metadata = { providers: [provider] };
        expect(factory.getStringifiedOpaqueToken(metadata)).to.be.eql(
          `{"providers":[{"provide":"ProvideValue","useValue":"${provider.useValue.toString()}"}]}`,
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

        expect(factory.getStringifiedOpaqueToken(metadata)).to.be.eql(
          '{"providers":[{"provide":"Symbol(a)","useValue":"a"},{"provide":"Symbol(b)","useValue":"b"}]}',
        );
      });
    });

    describe('when metadata does not exist', () => {
      it('should return empty string', () => {
        expect(factory.getStringifiedOpaqueToken(undefined)).to.be.eql('');
      });
    });
  });
});
