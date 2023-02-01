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
      const methods = scanner.getAllMethodNames(Test.prototype);
      expect(methods).to.eql(['test', 'test2', 'testParent', 'testParent2']);
    });

    it('should return the same instance for the same prototype', () => {
      const methods1 = scanner.getAllMethodNames(Test.prototype);
      const methods2 = scanner.getAllMethodNames(Test.prototype);
      expect(methods1 === methods2).to.eql(true);
    });

    it('should keep compatibility with older methods', () => {
      const methods1 = scanner.getAllMethodNames(Test.prototype).map(m => m[0]);
      const methods2 = scanner.scanFromPrototype(
        new Test(),
        Test.prototype,
        r => r[0],
      );

      expect(methods1).to.eql(methods2);

      const methods3 = scanner.getAllMethodNames(Test.prototype);
      const methods4 = [
        ...new Set(scanner.getAllFilteredMethodNames(Test.prototype)),
      ];

      expect(methods3).to.eql(methods4);
    });
  });
});
