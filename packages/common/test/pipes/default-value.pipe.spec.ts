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
