import { createRedactor } from '../../../services/utils/redact.util.js';

describe('createRedactor', () => {
  const redact = (paths: string[], value: unknown, censor?: string) =>
    createRedactor(paths, censor)!(value);

  it('should return undefined when there are no paths', () => {
    expect(createRedactor([])).toBeUndefined();
    expect(createRedactor(['', ' . '])).toBeUndefined();
  });

  describe('key names', () => {
    it('should redact a key at any depth', () => {
      expect(
        redact(['password'], {
          password: 'a',
          user: { name: 'John', password: 'b', profile: { password: 'c' } },
        }),
      ).toEqual({
        password: '[REDACTED]',
        user: {
          name: 'John',
          password: '[REDACTED]',
          profile: { password: '[REDACTED]' },
        },
      });
    });

    it('should compare keys case-insensitively', () => {
      expect(
        redact(['Authorization'], {
          headers: { authorization: 'Bearer x', AUTHORIZATION: 'Bearer y' },
        }),
      ).toEqual({
        headers: { authorization: '[REDACTED]', AUTHORIZATION: '[REDACTED]' },
      });
    });

    it('should replace an object value as a whole', () => {
      expect(
        redact(['credentials'], { credentials: { user: 'u', pass: 'p' } }),
      ).toEqual({ credentials: '[REDACTED]' });
    });

    it('should redact objects inside arrays', () => {
      expect(
        redact(['token'], {
          sessions: [{ id: 1, token: 'a' }, { id: 2 }, [{ token: 'b' }], 'x'],
        }),
      ).toEqual({
        sessions: [
          { id: 1, token: '[REDACTED]' },
          { id: 2 },
          [{ token: '[REDACTED]' }],
          'x',
        ],
      });
    });

    it('should only read the present items of a sparse array', () => {
      const items: unknown[] = [];
      items[999] = { password: 'a' };
      const reads: PropertyKey[] = [];
      const proxy = new Proxy(items, {
        get(target, key, receiver) {
          reads.push(key);
          return Reflect.get(target, key, receiver);
        },
      });

      const redacted = redact(['password'], { items: proxy }) as {
        items: unknown[];
      };

      expect(reads).toEqual(['999', 'length', '999']);
      expect(redacted.items).toHaveLength(1000);
      expect(0 in redacted.items).toBe(false);
      expect(redacted.items[999]).toEqual({ password: '[REDACTED]' });
    });

    it('should redact a sparse array with the largest index', () => {
      const items: unknown[] = [];
      items[2 ** 32 - 2] = { password: 'a' };

      const redacted = redact(['password'], items) as unknown[];

      expect(redacted).toHaveLength(2 ** 32 - 1);
      expect(0 in redacted).toBe(false);
      expect(redacted[2 ** 32 - 2]).toEqual({ password: '[REDACTED]' });
      expect(items[2 ** 32 - 2]).toEqual({ password: 'a' });
    });

    it('should use a custom censor', () => {
      expect(redact(['password'], { password: 'a' }, '***')).toEqual({
        password: '***',
      });
    });
  });

  describe('dotted paths', () => {
    const value = {
      user: { password: 'a', name: 'John' },
      admin: { password: 'b' },
      password: 'c',
      data: { user: { password: 'd' } },
    };

    it('should match the last keys leading to the property, at any depth', () => {
      expect(redact(['user.password'], value)).toEqual({
        user: { password: '[REDACTED]', name: 'John' },
        admin: { password: 'b' },
        password: 'c',
        data: { user: { password: '[REDACTED]' } },
      });
    });

    it('should match longer paths', () => {
      expect(redact(['data.user.password'], value)).toEqual({
        ...value,
        data: { user: { password: '[REDACTED]' } },
      });
    });

    it('should skip array indices', () => {
      expect(
        redact(['users.password'], {
          users: [{ password: 'a' }, { password: 'b' }],
        }),
      ).toEqual({
        users: [{ password: '[REDACTED]' }, { password: '[REDACTED]' }],
      });
    });

    it('should compare the keys case-insensitively', () => {
      expect(redact(['User.Password'], { USER: { password: 'a' } })).toEqual({
        USER: { password: '[REDACTED]' },
      });
    });
  });

  describe('errors', () => {
    it('should redact own properties and keep the error intact', () => {
      const error = Object.assign(new Error('Request failed'), {
        code: 'E_HTTP',
        config: { headers: { authorization: 'Bearer x' } },
      });

      const redacted = redact(['authorization'], error) as typeof error;

      expect(redacted).not.toBe(error);
      expect(redacted).toBeInstanceOf(Error);
      expect(redacted.message).toBe('Request failed');
      expect(redacted.stack).toBe(error.stack);
      expect(redacted.code).toBe('E_HTTP');
      expect(redacted.config.headers.authorization).toBe('[REDACTED]');
      expect(Object.keys(redacted)).toEqual(['code', 'config']);
      expect(error.config.headers.authorization).toBe('Bearer x');
    });

    it('should redact "cause" and "AggregateError#errors"', () => {
      const cause = Object.assign(new Error('cause'), { token: 'a' });
      const inner = Object.assign(new Error('inner'), { token: 'b' });
      const error = new AggregateError([inner], 'outer', { cause });

      const redacted = redact(['token'], error) as AggregateError;

      expect(redacted).toBeInstanceOf(AggregateError);
      expect((redacted.cause as any).token).toBe('[REDACTED]');
      expect((redacted.errors[0] as any).token).toBe('[REDACTED]');
      expect(
        Object.getOwnPropertyDescriptor(redacted, 'cause')!.enumerable,
      ).toBe(false);
    });
  });

  describe('maps and sets', () => {
    it('should redact map entries with a matching string key', () => {
      const map = new Map<unknown, unknown>([
        ['password', 'a'],
        ['user', { password: 'b' }],
        [1, { password: 'c' }],
        ['id', 1],
      ]);

      const redacted = redact(['password'], map) as Map<unknown, unknown>;

      expect(redacted).toBeInstanceOf(Map);
      expect([...redacted]).toEqual([
        ['password', '[REDACTED]'],
        ['user', { password: '[REDACTED]' }],
        [1, { password: '[REDACTED]' }],
        ['id', 1],
      ]);
      expect(map.get('password')).toBe('a');
    });

    it('should redact objects in sets', () => {
      const redacted = redact(
        ['password'],
        new Set([{ password: 'a' }, 'x']),
      ) as Set<unknown>;

      expect([...redacted]).toEqual([{ password: '[REDACTED]' }, 'x']);
    });

    it('should redact objects used as map keys', () => {
      const key = { id: 1, password: 'a' };
      const map = new Map<unknown, unknown>([
        [key, { token: 'b' }],
        [{ id: 2 }, 'ok'],
      ]);

      const redacted = redact(['password', 'token'], map) as Map<
        unknown,
        unknown
      >;

      expect([...redacted]).toEqual([
        [{ id: 1, password: '[REDACTED]' }, { token: '[REDACTED]' }],
        [{ id: 2 }, 'ok'],
      ]);
      expect(key.password).toBe('a');
    });
  });

  describe('headers, search params and form data', () => {
    it('should redact the entries of headers', () => {
      const headers = new Headers({
        authorization: 'Bearer abc',
        accept: 'application/json',
      });

      const redacted = redact(['authorization'], { headers }) as {
        headers: Headers;
      };

      expect(redacted.headers).toBeInstanceOf(Headers);
      expect([...redacted.headers]).toEqual([
        ['accept', 'application/json'],
        ['authorization', '[REDACTED]'],
      ]);
      expect(headers.get('authorization')).toBe('Bearer abc');
    });

    it('should redact every value of a repeated search param', () => {
      const params = new URLSearchParams('token=a&page=1&token=b');

      const redacted = redact(['token'], params) as URLSearchParams;

      expect(redacted).toBeInstanceOf(URLSearchParams);
      expect([...redacted]).toEqual([
        ['token', '[REDACTED]'],
        ['page', '1'],
        ['token', '[REDACTED]'],
      ]);
      expect(params.getAll('token')).toEqual(['a', 'b']);
    });

    it('should redact form data fields and keep files', () => {
      const file = new File(['content'], 'avatar.png', { type: 'image/png' });
      const form = new FormData();
      form.append('password', 'hunter2');
      form.append('avatar', file);

      const redacted = redact(['password'], form) as FormData;

      expect(redacted).toBeInstanceOf(FormData);
      expect(redacted.get('password')).toBe('[REDACTED]');
      const avatar = redacted.get('avatar') as File;
      expect(avatar.name).toBe('avatar.png');
      expect(avatar.type).toBe('image/png');
      expect(form.get('password')).toBe('hunter2');
    });

    it('should match dotted paths through them', () => {
      const value = {
        headers: new Headers({ authorization: 'a' }),
        other: new Headers({ authorization: 'b' }),
      };

      const redacted = redact(['headers.authorization'], value) as {
        headers: Headers;
        other: Headers;
      };

      expect(redacted.headers.get('authorization')).toBe('[REDACTED]');
      expect(redacted.other).toBe(value.other);
    });

    it('should redact headers with a censor that is not a header value', () => {
      const headers = new Headers({
        authorization: 'Bearer abc',
        accept: 'application/json',
      });

      const redacted = redact(['authorization'], { headers }, '••••') as {
        headers: Map<string, string>;
      };

      expect(redacted.headers).toEqual(
        new Map([
          ['accept', 'application/json'],
          ['authorization', '••••'],
        ]),
      );
    });

    it('should return them as they are when nothing matches', () => {
      const headers = new Headers({ accept: 'application/json' });

      expect(redact(['authorization'], headers)).toBe(headers);
    });
  });

  describe('class instances', () => {
    it('should keep the prototype of a copied instance', () => {
      class User {
        constructor(
          public name: string,
          public password: string,
        ) {}
        greet() {
          return `Hi ${this.name}`;
        }
      }

      const redacted = redact(['password'], {
        user: new User('John', 'secret'),
      }) as { user: User };

      expect(redacted.user).toBeInstanceOf(User);
      expect(redacted.user.password).toBe('[REDACTED]');
      expect(redacted.user.greet()).toBe('Hi John');
    });

    it('should not traverse dates, buffers and typed arrays', () => {
      const date = new Date();
      const buffer = Buffer.from('password');
      const value = { date, buffer, bytes: new Uint8Array(3) };

      expect(redact(['0', 'password'], value)).toBe(value);
    });
  });

  describe('circular structures', () => {
    it('should redact them without throwing', () => {
      const value: any = { password: 'a', child: { password: 'b' } };
      value.child.parent = value;
      value.self = value;

      expect(redact(['password'], value)).toEqual({
        password: '[REDACTED]',
        child: { password: '[REDACTED]', parent: '[Circular]' },
        self: '[Circular]',
      });
      expect(value.child.parent).toBe(value);
    });

    it('should not leak a secret through a circular reference', () => {
      const value: any = { password: 'a' };
      value.self = value;

      const output = JSON.stringify(redact(['password'], value));

      expect(output).not.toContain('"a"');
    });

    it('should copy repeated references that are not circular', () => {
      const shared = { password: 'a' };

      expect(redact(['password'], { a: shared, b: shared })).toEqual({
        a: { password: '[REDACTED]' },
        b: { password: '[REDACTED]' },
      });
    });
  });

  describe('shared objects', () => {
    it('should copy an object that is referenced several times once', () => {
      const shared = { password: 'a' };

      const redacted = redact(['password'], { a: shared, b: [shared] }) as {
        a: object;
        b: object[];
      };

      expect(redacted.a).toEqual({ password: '[REDACTED]' });
      expect(redacted.b[0]).toBe(redacted.a);
    });

    it('should apply a dotted path to each reference to a shared object', () => {
      const shared = { password: 'a' };

      expect(
        redact(['org.user.password'], {
          org: { user: shared },
          team: { user: shared },
        }),
      ).toEqual({
        org: { user: { password: '[REDACTED]' } },
        team: { user: { password: 'a' } },
      });
    });

    it('should not traverse a shared object once per reference', () => {
      // The shape of class-validator errors: every child error has the
      // validated array as its "target".
      const target = [{ password: 'a' }, ...new Array(1_000).fill(0)];
      const errors = target.map(() => ({ target }));
      // Every path through the layers leads to the same object.
      let layers: object = { password: 'a' };
      for (let i = 0; i < 16; i++) {
        layers = { a: layers, b: layers };
      }

      const redacted = redact(['password'], { errors, layers }) as any;

      expect(redacted.errors[0].target[0]).toEqual({ password: '[REDACTED]' });
      expect(redacted.errors[1_000].target).toBe(redacted.errors[0].target);
      expect(redacted.layers.a).toBe(redacted.layers.b);
    });

    it('should traverse a shared object once for the keys no dotted path goes through', () => {
      const shared = { password: 'a' };
      // Longer than the 16,383 characters up to which V8 hashes a string by
      // its content.
      const longKey = 'k'.repeat(20_000);

      const redacted = redact(['password', 'org.user.password'], {
        first: { [longKey]: shared },
        second: { [`${longKey}2`]: shared },
        org: { user: shared },
      }) as any;

      expect(redacted.first[longKey]).toEqual({ password: '[REDACTED]' });
      expect(redacted.second[`${longKey}2`]).toBe(redacted.first[longKey]);
      expect(redacted.org.user).toEqual({ password: '[REDACTED]' });
      expect(redacted.org.user).not.toBe(redacted.first[longKey]);
    });

    it('should tell keys a dotted path goes through from other keys', () => {
      const longKey = 'k'.repeat(20_000);

      expect(
        redact(['req.body.password'], {
          req: { [longKey]: { password: 'a' }, body: { password: 'b' } },
          [longKey]: { req: { body: { password: 'c' } } },
          body: { [longKey]: { password: 'd' } },
        }),
      ).toEqual({
        req: { [longKey]: { password: 'a' }, body: { password: '[REDACTED]' } },
        [longKey]: { req: { body: { password: '[REDACTED]' } } },
        body: { [longKey]: { password: 'd' } },
      });
    });
  });

  describe('copies', () => {
    it('should not mutate the input', () => {
      const value = Object.freeze({
        user: Object.freeze({ password: 'a', tags: Object.freeze(['x']) }),
      });

      expect(redact(['password'], value)).toEqual({
        user: { password: '[REDACTED]', tags: ['x'] },
      });
      expect(value.user.password).toBe('a');
    });

    it('should return the input itself when nothing matches', () => {
      const value = { user: { name: 'John' }, items: [{ id: 1 }] };

      expect(redact(['password'], value)).toBe(value);
    });

    it('should only copy the objects on the way to a redacted property', () => {
      const value = {
        untouched: { deep: { id: 1 } },
        items: [{ id: 1 }, { password: 'a' }],
      };

      const redacted = redact(['password'], value) as typeof value;

      expect(redacted).not.toBe(value);
      expect(redacted.untouched).toBe(value.untouched);
      expect(redacted.items).not.toBe(value.items);
      expect(redacted.items[0]).toBe(value.items[0]);
    });

    it('should copy an own "__proto__" key as a property', () => {
      const value = JSON.parse('{"__proto__": {"password": "a"}, "id": 1}');

      const redacted = redact(['password'], value) as Record<string, any>;

      expect(Object.getPrototypeOf(redacted)).toBe(Object.prototype);
      expect(Object.keys(redacted)).toEqual(['__proto__', 'id']);
      expect(redacted['__proto__']).toEqual({ password: '[REDACTED]' });
    });

    it('should return primitives as they are', () => {
      expect(redact(['password'], 'password')).toBe('password');
      expect(redact(['password'], 1)).toBe(1);
      expect(redact(['password'], undefined)).toBeUndefined();
    });
  });

  it('should replace a value it cannot traverse with the censor', () => {
    const value = {
      get broken() {
        throw new Error('getter');
      },
    };

    expect(redact(['password'], value)).toBe('[REDACTED]');
  });

  it('should traverse a large object quickly', () => {
    const value = {
      items: Array.from({ length: 10_000 }, (_, id) => ({
        id,
        name: `item-${id}`,
        meta: { tags: ['a', 'b'], owner: { id, email: 'x@y.z' } },
      })),
    };

    const start = performance.now();
    const redacted = redact(['password', 'user.token'], value);
    const elapsed = performance.now() - start;

    expect(redacted).toBe(value);
    // Generous bound: a few milliseconds on a laptop.
    expect(elapsed).toBeLessThan(1000);
  });
});
