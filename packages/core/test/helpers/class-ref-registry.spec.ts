import { expect } from 'chai';
import {
  getClassRef,
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
