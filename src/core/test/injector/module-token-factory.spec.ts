import {expect} from 'chai';
import * as sinon from 'sinon';

import {Shared, SingleScope} from '../../../index';
import {ModuleTokenFactory} from '../../injector/module-token-factory';

describe('ModuleTokenFactory', () => {
  let factory: ModuleTokenFactory;
  beforeEach(() => { factory = new ModuleTokenFactory(); });
  describe('create', () => {
    class Module {}
    it('should force global scope if it is not set', () => {
      const scope = 'global';
      const token = factory.create(
          Module as any,
          [ Module as any ],
      );
      expect(token).to.be.deep.eq(JSON.stringify({
        module : Module.name,
        scope,
      }));
    });
    it('should returns expected token', () => {
      const token = factory.create(
          SingleScope()(Module) as any,
          [ Module as any ],
      );
      expect(token).to.be.deep.eq(JSON.stringify({
        module : Module.name,
        scope : [ Module.name ],
      }));
    });
  });
  describe('getModuleName', () => {
    it('should map module metatype to name', () => {
      const metatype = () => {};
      expect(factory.getModuleName(metatype as any)).to.be.eql(metatype.name);
    });
  });
  describe('getScopeStack', () => {
    it('should map metatypes to the array with last metatype', () => {
      const metatype1 = () => {};
      const metatype2 = () => {};
      expect(factory.getScopeStack([ metatype1 as any, metatype2 as any ]))
          .to.be.eql([ metatype2.name ]);
    });
  });
});