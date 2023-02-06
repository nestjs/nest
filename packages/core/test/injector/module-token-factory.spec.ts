import { expect } from 'chai';
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
      const token1 = factory.create(type, undefined);
      const token2 = factory.create(type, undefined);
      expect(token1).to.be.deep.eq(token2);
    });
    it('should include dynamic metadata', () => {
      const type = Module;
      const token1 = factory.create(type, {
        providers: [{}],
      } as any);
      const token2 = factory.create(type, {
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
