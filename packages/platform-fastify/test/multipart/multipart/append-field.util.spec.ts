import { appendField } from '../../../multipart/multipart/append-field.util.js';

describe('appendField', () => {
  const build = (entries: [string, string][]) => {
    const store = Object.create(null);
    for (const [key, value] of entries) {
      appendField(store, key, value);
    }
    return JSON.parse(JSON.stringify(store));
  };

  it('should set plain keys and turn repeated keys into arrays', () => {
    expect(
      build([
        ['a', '1'],
        ['b', '2'],
        ['b', '3'],
      ]),
    ).toEqual({ a: '1', b: ['2', '3'] });
  });

  it('should nest objects and arrays', () => {
    expect(
      build([
        ['user[name]', 'Ada'],
        ['user[roles][]', 'admin'],
        ['user[roles][]', 'dev'],
        ['tags[0]', 'a'],
        ['tags[1]', 'b'],
        ['list[0][id]', '1'],
      ]),
    ).toEqual({
      user: { name: 'Ada', roles: ['admin', 'dev'] },
      tags: ['a', 'b'],
      list: [{ id: '1' }],
    });
  });

  it('should keep malformed paths as literal keys', () => {
    expect(
      build([
        ['a[b', '1'],
        ['[x]', '2'],
        ['c[]d', '3'],
      ]),
    ).toEqual({ 'a[b': '1', '[x]': '2', 'c[]d': '3' });
  });

  it('should turn an array into an object when a named key follows', () => {
    expect(
      build([
        ['a[0]', 'x'],
        ['a[k]', 'y'],
      ]),
    ).toEqual({ a: { 0: 'x', k: 'y' } });
  });

  it('should keep a scalar under the empty key when it gains children', () => {
    expect(
      build([
        ['a', 'x'],
        ['a[b]', 'y'],
      ]),
    ).toEqual({ a: { '': 'x', b: 'y' } });
  });

  it.each(['__proto__', '__proto__[x]', 'a[constructor]', 'a[prototype][x]'])(
    'should refuse the prototype-polluting name %s',
    key => {
      const store = Object.create(null);
      expect(appendField(store, key, '1')).toBe(false);
      expect(Object.keys(store)).toEqual([]);
      expect(({} as any).x).toBeUndefined();
    },
  );
});
