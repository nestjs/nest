import { expect } from 'chai';
import { MetadataScanner } from '../metadata-scanner';

describe('MetadataScanner', () => {
  let scanner: MetadataScanner;
  beforeEach(() => {
    scanner = new MetadataScanner();
  });
  describe('scanFromPrototype', () => {
    class Parent {
      constructor() {}
      public testParent() {}
      public testParent2() {}
      get propParent() {
        return '';
      }
      set valParent(value) {}
    }

    class Test extends Parent {
      constructor() {
        super();
      }
      get prop() {
        return '';
      }
      set val(value) {}
      public test() {}
      public test2() {}
    }

    it('should return only methods', () => {
      const methods = scanner.scanFromPrototype(
        new Test(),
        Test.prototype,
        a => a,
      );
      expect(methods).to.eql(['test', 'test2', 'testParent', 'testParent2']);
    });
  });
});
