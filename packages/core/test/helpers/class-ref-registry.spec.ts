import { expect } from 'chai';
import {
  getClassRef,
  getParamsHost,
  registerClassRef,
} from '../../helpers/class-ref-registry';

describe('getClassRef', () => {
  describe('when the class was not registered', () => {
    it('should return the "constructor" of the instance', () => {
      class NotRegistered {}
      expect(getClassRef(new NotRegistered())).to.equal(NotRegistered);
    });
  });
  describe('when the class was registered', () => {
    it('should return it even if the "constructor" was overwritten', () => {
      class Mixin {}
      class Host {}
      Host.prototype.constructor = Mixin;

      registerClassRef(Host);
      expect(getClassRef(new Host())).to.equal(Host);
    });
    it('should return it when it is a proxy of another class', () => {
      class Wrapped {}
      const Proxied = new Proxy(Wrapped, {});

      registerClassRef(Proxied);
      expect(getClassRef(new Proxied())).to.equal(Proxied);
    });
  });
});

describe('getParamsHost', () => {
  it('should return the class for the methods it declares or inherits', () => {
    class Parent {
      inherited() {}
    }
    class Child extends Parent {
      own() {}
    }
    expect(getParamsHost(Child, 'own')).to.equal(Child);
    expect(getParamsHost(Child, 'inherited')).to.equal(Child);
  });
  it('should return the wrapped class when the class is a proxy of it', () => {
    class Wrapped {
      own() {}
    }
    expect(getParamsHost(new Proxy(Wrapped, {}), 'own')).to.equal(Wrapped);
  });
  describe('when a mixin helper overwrote the "constructor" of the prototype', () => {
    class Mixin {
      mixedIn() {}
      replaced() {}
    }
    class Base {
      inherited() {}
    }
    class Host extends Base {
      own() {}
      replaced() {}
    }
    // What the TypeScript handbook's `applyMixins()` does
    Object.defineProperties(
      Host.prototype,
      Object.getOwnPropertyDescriptors(Mixin.prototype),
    );

    it('should return the mixin for the methods copied from it', () => {
      expect(getParamsHost(Host, 'mixedIn')).to.equal(Mixin);
      expect(getParamsHost(Host, 'replaced')).to.equal(Mixin);
    });
    it('should return the class for the methods it declares or inherits', () => {
      expect(getParamsHost(Host, 'own')).to.equal(Host);
      expect(getParamsHost(Host, 'inherited')).to.equal(Host);
    });
  });
});
