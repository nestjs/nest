import { DefaultValuePipe } from '../../pipes/default-value.pipe.js';

describe('DefaultValuePipe', () => {
  const defaultValue = 'default';
  const target = new DefaultValuePipe(defaultValue);

  describe('transform', () => {
    it('should return original value if one was provided', () => {
      const value = 'value';
      const result = target.transform(value);
      expect(result).toBe(value);
    });

    it('should return default value if no value was provided', () => {
      const result = target.transform(undefined);
      expect(result).toBe(defaultValue);
    });

    describe('when the default value is an array or a plain object', () => {
      it('should return a new copy of it on every call', () => {
        const target = new DefaultValuePipe<string[], string[]>([]);
        target.transform(undefined).push('first');

        expect(target.transform(undefined)).toEqual([]);
      });

      it('should copy the arrays and plain objects nested in it', () => {
        const target = new DefaultValuePipe({
          sort: { order: 'asc' },
          tags: ['a'],
        });
        const first = target.transform(undefined);
        first.sort.order = 'desc';
        first.tags.push('b');

        expect(target.transform(undefined)).toEqual({
          sort: { order: 'asc' },
          tags: ['a'],
        });
      });

      it('should preserve the length of an array containing only empty slots', () => {
        const slots = new Array<string>(7);
        const result = new DefaultValuePipe(slots).transform(undefined);

        expect(result).not.toBe(slots);
        expect(result).toHaveLength(7);
        expect(Object.keys(result)).toEqual([]);
      });

      it('should preserve trailing empty slots when copying an array', () => {
        const slots = new Array<string>(7);
        slots[1] = 'open';
        const result = new DefaultValuePipe(slots).transform(undefined);

        expect(result).not.toBe(slots);
        expect(result).toHaveLength(7);
        expect(Object.keys(result)).toEqual(['1']);
        expect(result[1]).toBe('open');
      });

      it('should preserve the length of a nested sparse array', () => {
        const defaults = { slots: new Array<string>(7) };
        const result = new DefaultValuePipe(defaults).transform(undefined);

        expect(result.slots).not.toBe(defaults.slots);
        expect(result.slots).toHaveLength(7);
        expect(Object.keys(result.slots)).toEqual([]);
      });

      it('should keep symbol keys and a null prototype', () => {
        const ne = Symbol('ne');
        const where = Object.assign(Object.create(null), {
          status: { [ne]: 'deleted' },
        });
        const result = new DefaultValuePipe(where).transform(undefined);

        expect(result).not.toBe(where);
        expect(Object.getPrototypeOf(result)).toBeNull();
        expect(result.status[ne]).toBe('deleted');
      });

      it('should copy an own __proto__ field without changing the prototype', () => {
        const value = JSON.parse('{"__proto__":{"tags":["a"]},"enabled":true}');
        const target = new DefaultValuePipe(value);
        const first = target.transform(undefined);

        expect(Object.getPrototypeOf(first)).toBe(Object.prototype);
        expect(Object.hasOwn(first, '__proto__')).toBe(true);
        expect(first).toEqual(value);
        expect(first.__proto__).not.toBe(value.__proto__);
        first.__proto__.tags.push('b');
        expect(target.transform(undefined).__proto__.tags).toEqual(['a']);
        expect(value.__proto__.tags).toEqual(['a']);
      });

      it('should copy own __proto__ fields on arrays and nested defaults', () => {
        const key = Symbol('shared');
        const shared = { tags: ['a'] };
        const array = new Array(3);
        Object.defineProperty(array, '__proto__', {
          value: shared,
          enumerable: true,
        });
        const value = { array, [key]: shared };
        const first = new DefaultValuePipe(value).transform(undefined);

        expect(Array.isArray(first.array)).toBe(true);
        expect(Object.getPrototypeOf(first.array)).toBe(Array.prototype);
        expect(Object.hasOwn(first.array, '__proto__')).toBe(true);
        expect(first.array.length).toBe(3);
        expect(0 in first.array).toBe(false);
        expect(Reflect.get(first.array, '__proto__')).toBe(first[key]);
        expect(first[key]).not.toBe(shared);
        first[key].tags.push('b');
        expect(shared.tags).toEqual(['a']);
      });

      it('should preserve circular references', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        const result = new DefaultValuePipe(circular).transform(undefined);

        expect(result).not.toBe(circular);
        expect(result.self).toBe(result);
      });

      it('should return any other object (e.g., a class instance) as is', () => {
        class Tags extends Array<string> {}
        class Filter {}
        const values = [new Tags(), new Filter(), new Date(), new Map()];

        for (const value of values) {
          expect(new DefaultValuePipe(value).transform(undefined)).toBe(value);
        }
        const nested = new DefaultValuePipe({ values }).transform(undefined);
        nested.values.forEach((value: unknown, index: number) =>
          expect(value).toBe(values[index]),
        );
      });
    });
  });
});
