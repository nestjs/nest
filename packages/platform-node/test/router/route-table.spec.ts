import {
  MAX_PARAM_LENGTH,
  PARAM_TOO_LONG,
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
        seqs: [0],
      });
      expect(table.lookup('GET', '/users/1')).toBeNull();
      expect(table.lookup('GET', '/user')).toBeNull();
    });

    it('should not match a path that does not start with "/"', () => {
      table.add('GET', '/admin/users', handler());
      table.add('GET', '/admin/:id', handler());
      table.add('GET', '/files{.:ext}', handler());
      table.add(null, '/', handler());

      expect(table.lookup('GET', '/admin/users')).not.toBeNull();
      // find-my-way would read the "*" as the leading "/"
      expect(table.lookup('GET', '*admin/users')).toBeNull();
      expect(table.lookup('GET', 'xadmin/1')).toBeNull();
      expect(table.lookup('GET', '*files.json')).toBeNull();
      expect(table.lookup('OPTIONS', '*')).toBeNull();
      expect(table.lookup('GET', '')).toBeNull();
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

    it('should prefer a more specific route over a catch-all for every method registered before it', () => {
      const all = handler();
      const cats = handler();
      const cat = handler();
      table.add(null, '/*path', all);
      table.add('GET', '/cats', cats);
      table.add('GET', '/cats/:id', cat);

      expect(table.lookup('GET', '/cats')?.handlers).toEqual([cats]);
      expect(table.lookup('GET', '/cats/1')?.handlers).toEqual([cat]);
      expect(table.lookup('HEAD', '/cats')?.handlers).toEqual([cats]);
      expect(table.lookup('POST', '/cats')?.handlers).toEqual([all]);
      expect(table.lookup('GET', '/dogs')?.handlers).toEqual([all]);
    });

    it('should prefer a more specific route for every method over a catch-all registered before it', () => {
      const get = handler();
      const all = handler();
      table.add('GET', '/*path', get);
      table.add(null, '/health', all);

      expect(table.lookup('GET', '/health')?.handlers).toEqual([all]);
      expect(table.lookup('GET', '/other')?.handlers).toEqual([get]);
    });

    it('should prefer a more specific GET route over a HEAD catch-all, as Fastify does', () => {
      const head = handler();
      const cats = handler();
      table.add('HEAD', '/*path', head);
      table.add('GET', '/cats', cats);

      expect(table.lookup('HEAD', '/cats')?.handlers).toEqual([cats]);
      expect(table.lookup('HEAD', '/dogs')?.handlers).toEqual([head]);
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

    it('should try the other routes when the most specific one leaves a parameter empty', () => {
      const docs = handler();
      const all = handler();
      table.add('GET', '/docs/:name.:ext', handler());
      table.add('GET', '/docs/*path', docs);
      table.add('GET', '/files/:name.:ext', handler());
      table.add(null, '/{*path}', all);

      // As Express, which tries the routes in registration order
      expect(table.lookup('GET', '/docs/.env')).toEqual({
        handlers: [docs],
        params: { path: ['.env'] },
        seqs: [1],
      });
      expect(table.lookup('GET', '/files/.env')?.handlers).toEqual([all]);
    });

    it('should split a wildcard into path segments', () => {
      table.add('GET', '/files/*path', handler());

      expect(table.lookup('GET', '/files/a/b.txt')?.params).toEqual({
        path: ['a', 'b.txt'],
      });
    });

    it('should keep an encoded "/" within its wildcard segment', () => {
      table.add('GET', '/files/*path', handler());

      // As path-to-regexp (and Express) do: split first, then decode
      expect(table.lookup('GET', '/files/a%2Fb/c')?.params).toEqual({
        path: ['a/b', 'c'],
      });
    });

    it('should not include a trailing slash in a wildcard', () => {
      table.add('GET', '/files/*path', handler());

      expect(table.lookup('GET', '/files/a/b/')?.params).toEqual({
        path: ['a', 'b'],
      });
    });

    it('should not match an empty wildcard', () => {
      table.add('GET', '/files/*path', handler());

      expect(table.lookup('GET', '/files/')).toBeNull();
      expect(table.lookup('GET', '/files')).toBeNull();
    });

    it('should leave the text before a wildcard in its segment out of it', () => {
      table.add('GET', '/files/v-*rest', handler());
      // The Express 4 "ab*cd" example, as path-to-regexp 8 reads it
      table.add('GET', '/ab*cd', handler());

      expect(table.lookup('GET', '/files/v-abc/def')?.params).toEqual({
        rest: ['abc', 'def'],
      });
      expect(table.lookup('GET', '/abxyz')?.params).toEqual({ cd: ['xyz'] });
    });

    it('should not match the text before a wildcard alone', () => {
      table.add('GET', '/files/v-*rest', handler());
      table.add('GET', '/ab*cd', handler());

      // As path-to-regexp, so a route cannot run without its middleware
      expect(table.lookup('GET', '/files/v-')).toBeNull();
      expect(table.lookup('GET', '/ab')).toBeNull();
    });

    it('should try the other routes for the text before a wildcard alone', () => {
      const id = handler();
      table.add('GET', '/files/v-*rest', handler());
      table.add('GET', '/files/:id', id);

      expect(table.lookup('GET', '/files/v-')).toEqual({
        handlers: [id],
        params: { id: 'v-' },
        seqs: [1],
      });
    });

    it('should prefer a wildcard after text over a parameter of the segment', () => {
      const id = handler();
      const rest = handler();
      table.add('GET', '/files/:id', id);
      table.add('GET', '/files/v-*rest', rest);

      expect(table.lookup('GET', '/files/v-abc')?.handlers).toEqual([rest]);
      expect(table.lookup('GET', '/files/abc')?.handlers).toEqual([id]);
    });

    it('should match a wildcard after a parameter of its segment', () => {
      table.add('GET', '/tags/:id-*rest', handler());

      expect(table.lookup('GET', '/tags/12-a/b')?.params).toEqual({
        id: '12',
        rest: ['a', 'b'],
      });
      expect(table.lookup('GET', '/tags/12-')).toBeNull();
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
      expect(table.lookup('GET', `/users/${value(101)}`)).toBe(PARAM_TOO_LONG);
    });

    it('should count the decoded characters', () => {
      table.add('GET', '/users/:id', handler());

      // 100 characters once decoded, 300 encoded
      expect(table.lookup('GET', `/users/${'%2F'.repeat(100)}`)).not.toBeNull();
      expect(table.lookup('GET', `/users/${'%2F'.repeat(101)}`)).toBe(
        PARAM_TOO_LONG,
      );
    });

    it('should apply the same limit to routes matched with path-to-regexp', () => {
      // A wildcard that is not the last token is beyond find-my-way
      table.add('GET', '/a/*rest/end/:id', handler());

      expect(table.lookup('GET', `/a/b/end/${value(100)}`)).not.toBeNull();
      expect(table.lookup('GET', `/a/b/end/${value(101)}`)).toBe(
        PARAM_TOO_LONG,
      );
    });

    it('should return null rather than PARAM_TOO_LONG when no route would match anyway', () => {
      table.add('GET', '/users/:id', handler());

      expect(table.lookup('GET', `/posts/${value(101)}`)).toBeNull();
      expect(table.lookup('POST', `/users/${value(101)}`)).toBeNull();
    });

    it('should report too-long parameters of GET routes for HEAD and of routes for every method', () => {
      table.add('GET', '/users/:id', handler());
      table.add(null, '/posts/:id', handler());

      expect(table.lookup('HEAD', `/users/${value(101)}`)).toBe(PARAM_TOO_LONG);
      expect(table.lookup('DELETE', `/posts/${value(101)}`)).toBe(
        PARAM_TOO_LONG,
      );
    });

    it('should take the limit from the maxParamLength option', () => {
      const custom = new RouteTable({ maxParamLength: 200 });
      custom.add('GET', '/users/:id', handler());
      custom.add('GET', '/a/*rest/end/:id', handler());

      expect(custom.lookup('GET', `/users/${value(200)}`)).not.toBe(
        PARAM_TOO_LONG,
      );
      expect(custom.lookup('GET', `/users/${value(201)}`)).toBe(PARAM_TOO_LONG);
      expect(custom.lookup('GET', `/a/b/end/${value(200)}`)).not.toBe(
        PARAM_TOO_LONG,
      );
      expect(custom.lookup('GET', `/a/b/end/${value(201)}`)).toBe(
        PARAM_TOO_LONG,
      );
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

    it('should match without the group when the group would leave a parameter empty', () => {
      table.add('GET', '/ext/:file{.:ext}', handler());
      table.add('GET', '/grp/:a{-:b}', handler());

      // "/ext/:file.:ext" would leave "file" empty, "/ext/:file" matches
      expect(table.lookup('GET', '/ext/.gitignore')?.params).toEqual({
        file: '.gitignore',
      });
      expect(table.lookup('GET', '/grp/x-')?.params).toEqual({ a: 'x-' });
      expect(table.lookup('GET', '/ext/a.b')?.params).toEqual({
        file: 'a',
        ext: 'b',
      });
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

    it('should return the first matching route, and the others from lookupRest()', () => {
      const first = handler();
      const second = handler();
      table.add('GET', '/files/*path/raw', first);
      table.add('GET', '/files/*rest/raw', second);

      expect(table.lookup('GET', '/files/a/raw')).toEqual({
        handlers: [first],
        params: { path: ['a'] },
        seqs: [0],
      });
      expect(table.lookupRest('GET', '/files/a/raw', [0])).toEqual([
        { handler: second, params: { rest: ['a'] } },
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
        seqs: [0, 1],
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
        seqs: [0, 1],
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
        seqs: [0, 1],
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
        seqs: [0, 1],
      });
      expect(table.lookup('HEAD', '/users/1')?.handlers).toEqual([all, get]);
      expect(table.lookup('DELETE', '/users/1')?.handlers).toEqual([all]);
    });
  });

  describe('optional groups after a "/"', () => {
    it.each(['/admin/{*path}', '/admin/{:id}'])(
      'should match %s on "/admin/" and below, but not on "/admin"',
      path => {
        table.add('GET', path, handler());

        // As with Express, where the middleware of the route matches the same
        // paths
        expect(table.lookup('GET', '/admin')).toBeNull();
        expect(table.lookup('GET', '/admin/')).not.toBeNull();
        expect(table.lookup('GET', '/admin/x')).not.toBeNull();
      },
    );

    it('should prefer such a route (the legacy "files/*") over less specific routes', () => {
      const files = handler();
      const section = handler();
      const root = handler();
      table.add('GET', '/files/{*path}', files);
      table.add('GET', '/:section/:id', section);
      table.add('GET', '/{*path}', root);

      expect(table.lookup('GET', '/files/readme')).toEqual({
        handlers: [files],
        params: { path: ['readme'] },
        seqs: [0],
      });
      expect(table.lookup('GET', '/files/a/b')?.handlers).toEqual([files]);
      expect(table.lookup('GET', '/files/')?.handlers).toEqual([files]);
      expect(table.lookup('GET', '/other/1')?.handlers).toEqual([section]);
      expect(table.lookup('GET', '/x')?.handlers).toEqual([root]);
    });

    it('should prefer such a route over a catch-all registered before it', () => {
      const spa = handler();
      const api = handler();
      table.add('GET', '/{*path}', spa);
      table.add(null, '/api/{*path}', api);

      expect(table.lookup('GET', '/api/users')?.handlers).toEqual([api]);
      expect(table.lookup('GET', '/about')?.handlers).toEqual([spa]);
    });

    it('should give the parameters of path-to-regexp for a path ending with "/"', () => {
      table.add('GET', '/x{/:y}/{*z}', handler());

      expect(table.lookup('GET', '/x/1/')?.params).toEqual({ y: '1' });
      expect(table.lookup('GET', '/x/1/2')?.params).toEqual({
        y: '1',
        z: ['2'],
      });
      expect(table.lookup('GET', '/x')).toBeNull();
    });
  });

  describe('lookupRest()', () => {
    it('should return the other matching routes in registration order, with their own parameters', () => {
      const byId = handler();
      const me = handler();
      const all = handler();
      table.add('GET', '/items/:id', byId);
      table.add('GET', '/items/me', me);
      table.add(null, '/items/{*rest}', all);

      const found = table.lookup('GET', '/items/me');

      expect(found?.handlers).toEqual([me]);
      expect(table.lookupRest('GET', '/items/me', found!.seqs)).toEqual([
        { handler: byId, params: { id: 'me' } },
        { handler: all, params: { rest: ['me'] } },
      ]);
    });

    it('should only return routes for the method, and GET routes for HEAD', () => {
      const get = handler();
      table.add('GET', '/items/:id', get);
      table.add('POST', '/items/:id', handler());

      expect(
        table.lookupRest('HEAD', '/items/1', []).map(e => e.handler),
      ).toEqual([get]);
      expect(table.lookupRest('DELETE', '/items/1', [])).toEqual([]);
    });

    it('should skip routes whose parameter is too long', () => {
      table.add('GET', '/items/:id', handler());

      expect(
        table.lookupRest(
          'GET',
          `/items/${'a'.repeat(MAX_PARAM_LENGTH + 1)}`,
          [],
        ),
      ).toEqual([]);
    });
  });
});
