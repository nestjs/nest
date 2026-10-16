import { stripProtoKeys } from '../../utils/strip-proto-keys.util.js';

describe('stripProtoKeys', () => {
  describe('with built-in JavaScript primitives', () => {
    it('should not throw error when processing Date objects', () => {
      const value = { date: new Date() };
      expect(() => stripProtoKeys(value)).not.toThrow();
    });

    it('should not throw error when processing RegExp objects', () => {
      const value = { regex: /test/i };
      expect(() => stripProtoKeys(value)).not.toThrow();
    });

    it('should not throw error when processing Error objects', () => {
      const value = { error: new Error('test') };
      expect(() => stripProtoKeys(value)).not.toThrow();
    });

    it('should not throw error when processing Map objects', () => {
      const value = { map: new Map() };
      expect(() => stripProtoKeys(value)).not.toThrow();
    });

    it('should not throw error when processing Set objects', () => {
      const value = { set: new Set() };
      expect(() => stripProtoKeys(value)).not.toThrow();
    });

    it('should preserve Date object properties', () => {
      const date = new Date();
      const value = { date };
      stripProtoKeys(value);
      expect(value.date).toBe(date);
      expect(value.date.constructor).toBe(Date);
    });
  });

  describe('with plain objects', () => {
    it('should still strip constructor from regular objects', () => {
      const value = { nested: { constructor: 'malicious' } };
      stripProtoKeys(value);
      expect(value.nested).not.toHaveProperty('constructor');
    });

    it('should strip constructor whatever its value', () => {
      for (const constructor of [null, 0, false, '']) {
        const value = { constructor, nested: { constructor } };
        stripProtoKeys(value);
        expect(Object.keys(value)).toEqual(['nested']);
        expect(Object.keys(value.nested)).toEqual([]);
      }
    });

    it('should leave objects without a prototype as they are', () => {
      const value = Object.assign(Object.create(null), { id: 1 });
      stripProtoKeys(value);
      expect(value).toEqual({ id: 1 });
    });

    it('should strip __proto__ from objects', () => {
      const value = { __proto__: { malicious: 'code' } };
      stripProtoKeys(value);
      expect(value).not.toHaveProperty('__proto__');
    });

    it('should strip prototype from objects', () => {
      const value = { prototype: { malicious: 'code' } };
      stripProtoKeys(value);
      expect(value).not.toHaveProperty('prototype');
    });

    it('should recursively strip nested objects', () => {
      const value = {
        level1: {
          constructor: 'malicious',
          level2: {
            constructor: 'alsoMalicious',
          },
        },
      };
      stripProtoKeys(value);
      expect(value.level1).not.toHaveProperty('constructor');
      expect(value.level1.level2).not.toHaveProperty('constructor');
    });
  });

  describe('with arrays', () => {
    it('should process arrays recursively', () => {
      const value = {
        items: [{ constructor: 'malicious' }, { constructor: 'alsoMalicious' }],
      };
      stripProtoKeys(value);
      expect(value.items[0]).not.toHaveProperty('constructor');
      expect(value.items[1]).not.toHaveProperty('constructor');
    });

    it('should not throw error when array contains Date objects', () => {
      const value = { dates: [new Date(), new Date()] };
      expect(() => stripProtoKeys(value)).not.toThrow();
    });

    it('should only read the items of a sparse array, not every index', () => {
      const items: any[] = [];
      items[999] = { constructor: 'malicious' };
      const reads: PropertyKey[] = [];
      const value = {
        items: new Proxy(items, {
          get(target, key, receiver) {
            reads.push(key);
            return Reflect.get(target, key, receiver);
          },
        }),
      };
      stripProtoKeys(value);
      expect(reads).toEqual(['999']);
      expect(items[999]).not.toHaveProperty('constructor');
    });

    it('should strip the items of a sparse array with the largest index', () => {
      const items: any[] = [];
      items[2 ** 32 - 2] = { constructor: 'malicious' };
      stripProtoKeys({ items });
      expect(items).toHaveLength(2 ** 32 - 1);
      expect(items[2 ** 32 - 2]).not.toHaveProperty('constructor');
    });
  });

  describe('Issue #16195: Jest useFakeTimers compatibility', () => {
    it('should handle Date objects with non-configurable constructor', () => {
      const value = { date: new Date() };

      Object.defineProperty(value.date, 'constructor', {
        value: Date,
        writable: false,
        enumerable: false,
        configurable: false,
      });

      expect(() => stripProtoKeys(value)).not.toThrow();
    });

    it('should not attempt to delete constructor from built-in types', () => {
      const testCases = [
        { date: new Date() },
        { regex: /test/i },
        { error: new Error('test') },
        { map: new Map() },
        { set: new Set() },
      ];

      testCases.forEach(testCase => {
        expect(() => stripProtoKeys(testCase)).not.toThrow();
      });
    });
  });
});
