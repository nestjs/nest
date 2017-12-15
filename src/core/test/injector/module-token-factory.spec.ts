import * as sinon from 'sinon';
import { expect } from 'chai';
import { ModuleTokenFactory } from '../../injector/module-token-factory';
import { Shared, SingleScope } from '../../../index';

describe('ModuleTokenFactory', () => {
    let factory: ModuleTokenFactory;
    beforeEach(() => {
        factory = new ModuleTokenFactory();
    });
    describe('create', () => {
        class Module {}
        it('should force global scope when it is not set', () => {
            const scope = 'global';
            const token = factory.create(
                Module as any,
                [Module as any],
                undefined,
            );
            expect(token).to.be.deep.eq(JSON.stringify({
                module: Module.name,
                dynamic: '',
                scope,
            }));
        });
        it('should returns expected token', () => {
            const token = factory.create(
                SingleScope()(Module) as any,
                [Module as any],
                undefined,
            );
            expect(token).to.be.deep.eq(JSON.stringify({
                module: Module.name,
                dynamic: '',
                scope: [Module.name],
            }));
        });
        it('should include dynamic metadata', () => {
            const token = factory.create(
                SingleScope()(Module) as any,
                [Module as any],
                {
                  components: [{}],
                } as any,
            );
            expect(token).to.be.deep.eq(JSON.stringify({
                module: Module.name,
                dynamic: JSON.stringify({
                  components: [{}],
                }),
                scope: [Module.name],
            }));
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
        it('should return stringified metadata', () => {
          const metadata = { components: ['', {}]};
          expect(factory.getDynamicMetadataToken(metadata)).to.be.eql(JSON.stringify(metadata));
        });
      });
      describe('when metadata does not exist', () => {
        it('should return empty string', () => {
          expect(factory.getDynamicMetadataToken(undefined)).to.be.eql('');
        });
      });
  });
    describe('getScopeStack', () => {
        it('should map metatypes to the array with last metatype', () => {
            const metatype1 = () => {};
            const metatype2 = () => {};
            expect(factory.getScopeStack([metatype1 as any, metatype2 as any])).to.be.eql([metatype2.name]);
        });
    });
});