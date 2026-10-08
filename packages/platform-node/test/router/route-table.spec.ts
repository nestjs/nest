import {
  MAX_PARAM_LENGTH,
  type RouteHandler,
  RouteTable,
} from '../../router/route-table.js';

function handler(): RouteHandler {
  return () => {};
}

describe('RouteTable', () => {
  let table: RouteTable;

  beforeEach(() => {
    table = new RouteTable();
  });

  describe('matching', () => {
    it('should match static paths', () => {
      const users = handler();
      table.add('GET', '/users', users);

      expect(table.lookup('GET', '/users')).toEqual({
        handlers: [users],
        params: {},
      });
      expect(table.lookup('GET', '/users/1')).toBeNull();
      expect(table.lookup('GET', '/user')).toBeNull();
    });

    it('should only match the registered method', () => {
      table.add('POST', '/users', handler());

      expect(table.lookup('POST', '/users')).not.toBeNull();
      expect(table.lookup('GET', '/users')).toBeNull();
      expect(table.lookup('PUT', '/users')).toBeNull();
    });

    it('should match HEAD requests with GET routes', () => {
      const get = handler();
      table.add('GET', '/users', get);

      expect(table.lookup('HEAD', '/users')?.handlers).toEqual([get]);
    });

    it('should prefer a HEAD route over the GET route', () => {
      const get = handler();
      const head = handler();
      table.add('GET', '/users', get);
      table.add('HEAD', '/users', head);

      expect(table.lookup('HEAD', '/users')?.handlers).toEqual([head]);
    });

    it('should ignore a trailing slash', () => {
      table.add('GET', '/users', handler());
      table.add('GET', '/posts/', handler());

      expect(table.lookup('GET', '/users/')).not.toBeNull();
      expect(table.lookup('GET', '/posts')).not.toBeNull();
    });

    it('should prefer the most specific route, whatever the registration order', () => {
      const byId = handler();
      const me = handler();
      table.add('GET', '/users/:id', byId);
      table.add('GET', '/users/me', me);

      expect(table.lookup('GET', '/users/me')?.handlers).toEqual([me]);
      expect(table.lookup('GET', '/users/1')?.handlers).toEqual([byId]);
    });
  });

  describe('parameters', () => {
    it('should extract named parameters', () => {
      table.add('GET', '/users/:id/posts/:postId', handler());

      expect(table.lookup('GET', '/users/1/posts/2')?.params).toEqual({
        id: '1',
        postId: '2',
      });
    });

    it('should decode parameters, including the reserved characters', () => {
      table.add('GET', '/files/:name', handler());

      // The routing path keeps "%2F" encoded (see getRoutingPath())
      expect(table.lookup('GET', '/files/a%2Fb')?.params).toEqual({
        name: 'a/b',
      });
    });

    it('should not match an empty parameter', () => {
      table.add('GET', '/users/:id/profile', handler());
      table.add('GET', '/posts/:id', handler());

      expect(table.lookup('GET', '/users//profile')).toBeNull();
      expect(table.lookup('GET', '/posts/')).toBeNull();
    });

    it('should split a wildcard into path segments', () => {
      table.add('GET', '/files/*path', handler());

      expect(table.lookup('GET', '/files/a/b.txt')?.params).toEqual({
        path: ['a', 'b.txt'],
      });
    });

    it('should not match an empty wildcard', () => {
      table.add('GET', '/files/*path', handler());

      expect(table.lookup('GET', '/files/')).toBeNull();
      expect(table.lookup('GET', '/files')).toBeNull();
    });

    it('should read the parameter name up to the text that follows it', () => {
      table.add('GET', '/users/:id@profile', handler());
      table.add('GET', '/tabs/:id~:tab', handler());
      table.add('GET', '/files/:name.:ext', handler());

      expect(table.lookup('GET', '/users/1@profile')?.params).toEqual({
        id: '1',
      });
      expect(table.lookup('GET', '/tabs/1~posts')?.params).toEqual({
        id: '1',
        tab: 'posts',
      });
      expect(table.lookup('GET', '/files/report.pdf')?.params).toEqual({
        name: 'report',
        ext: 'pdf',
      });
    });

    it('should support quoted parameter names', () => {
      table.add('GET', '/files/:"file-name"', handler());

      expect(table.lookup('GET', '/files/a')?.params).toEqual({
        'file-name': 'a',
      });
    });
  });

  describe('parameter length', () => {
    const value = (length: number) => 'x'.repeat(length);

    it(`should match parameters of up to ${MAX_PARAM_LENGTH} characters`, () => {
      table.add('GET', '/users/:id', handler());

      expect(MAX_PARAM_LENGTH).toBe(100);
      expect(table.lookup('GET', `/users/${value(100)}`)?.params).toEqual({
        id: value(100),
      });
      expect(table.lookup('GET', `/users/${value(101)}`)).toBeNull();
    });

    it('should count the decoded characters', () => {
      table.add('GET', '/users/:id', handler());

      // 100 characters once decoded, 300 encoded
      expect(table.lookup('GET', `/users/${'%2F'.repeat(100)}`)).not.toBeNull();
      expect(table.lookup('GET', `/users/${'%2F'.repeat(101)}`)).toBeNull();
    });

    it('should apply the same limit to routes matched with path-to-regexp', () => {
      // A wildcard that is not the last token is beyond find-my-way
      table.add('GET', '/a/*rest/end/:id', handler());

      expect(table.lookup('GET', `/a/b/end/${value(100)}`)).not.toBeNull();
      expect(table.lookup('GET', `/a/b/end/${value(101)}`)).toBeNull();
    });

    it('should fall through to another matching route', () => {
      const byId = handler();
      const catchAll = handler();
      table.add('GET', '/users/:id', byId);
      table.add('GET', '/users/*rest', catchAll);

      expect(table.lookup('GET', `/users/${value(101)}`)?.handlers).toEqual([
        catchAll,
      ]);
    });

    it('should not limit wildcards', () => {
      table.add('GET', '/files/*path', handler());

      expect(table.lookup('GET', `/files/${value(500)}`)?.params.path).toEqual([
        value(500),
      ]);
    });
  });

  describe('optional groups', () => {
    it('should match a path with and without the optional part', () => {
      table.add('GET', '/users{/:id}', handler());

      expect(table.lookup('GET', '/users')?.params).toEqual({});
      expect(table.lookup('GET', '/users/1')?.params).toEqual({ id: '1' });
    });

    it('should fill the earlier group first, as path-to-regexp does', () => {
      table.add('GET', '/a{/:x}{/:y}', handler());

      expect(table.lookup('GET', '/a/1')?.params).toEqual({ x: '1' });
      expect(table.lookup('GET', '/a/1/2')?.params).toEqual({
        x: '1',
        y: '2',
      });
    });

    it('should still match a path with more groups than it expands', () => {
      table.add('GET', '/a{/b}{/c}{/d}{/e}{/f}{/g}{/h}', handler());

      expect(table.lookup('GET', '/a')).not.toBeNull();
      expect(table.lookup('GET', '/a/b/h')).not.toBeNull();
      expect(table.lookup('GET', '/a/h/b')).toBeNull();
    });
  });

  describe('paths find-my-way cannot express', () => {
    it('should match a wildcard followed by more segments', () => {
      table.add('GET', '/files/*path/raw', handler());

      expect(table.lookup('GET', '/files/a/b/raw')?.params).toEqual({
        path: ['a', 'b'],
      });
      expect(table.lookup('GET', '/files/a/b')).toBeNull();
    });

    it('should run every matching route in registration order', () => {
      const first = handler();
      const second = handler();
      table.add('GET', '/files/*path/raw', first);
      table.add('GET', '/files/*path/raw', second);

      expect(table.lookup('GET', '/files/a/raw')?.handlers).toEqual([
        first,
        second,
      ]);
    });
  });

  describe('several handlers for one route', () => {
    it('should chain the handlers of a route registered more than once', () => {
      const first = handler();
      const second = handler();
      table.add('GET', '/users/:id', first);
      table.add('GET', '/users/:id', second);

      expect(table.lookup('GET', '/users/1')).toEqual({
        handlers: [first, second],
        params: { id: '1' },
      });
    });

    it('should chain routes that only differ by their parameter names', () => {
      const v1 = handler();
      const v2 = handler();
      table.add('GET', '/users/:id', v1);
      table.add('GET', '/users/:userId', v2);

      expect(table.lookup('GET', '/users/1')).toEqual({
        handlers: [v1, v2],
        params: { id: '1', userId: '1' },
      });
    });

    it('should chain wildcard routes that only differ by the wildcard name', () => {
      const v1 = handler();
      const v2 = handler();
      table.add('GET', '/files/*path', v1);
      table.add('GET', '/files/*rest', v2);

      expect(table.lookup('GET', '/files/a/b')).toEqual({
        handlers: [v1, v2],
        params: { path: ['a', 'b'], rest: ['a', 'b'] },
      });
    });

    it('should merge routes for every method with the method routes in registration order', () => {
      const all = handler();
      const get = handler();
      table.add(null, '/users/:id', all);
      table.add('GET', '/users/:id', get);

      expect(table.lookup('GET', '/users/1')).toEqual({
        handlers: [all, get],
        params: { id: '1' },
      });
      expect(table.lookup('DELETE', '/users/1')?.handlers).toEqual([all]);
    });
  });
});
