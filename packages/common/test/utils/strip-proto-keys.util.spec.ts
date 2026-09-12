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
