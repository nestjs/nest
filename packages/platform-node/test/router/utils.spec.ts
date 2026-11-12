import {
  getDecodedForms,
  getLiteralPrefix,
  getPrefixSkips,
  getRawPrefixEnd,
  getRoutingPath,
  hasTextDecodedByRouter,
  loosen,
} from '../../router/utils.js';

describe('loosen', () => {
  it('should drop the trailing slashes of a path', () => {
    expect(loosen('/users/')).toBe('/users');
    expect(loosen('/users//')).toBe('/users');
    expect(loosen('/users')).toBe('/users');
  });

  it('should keep the root path', () => {
    expect(loosen('/')).toBe('/');
  });
});

describe('getLiteralPrefix', () => {
  it('should return the text before the first parameter, wildcard or group', () => {
    expect(getLiteralPrefix('/users/:id')).toBe('/users/');
    expect(getLiteralPrefix('/users/:id/posts')).toBe('/users/');
    expect(getLiteralPrefix('/files/*path')).toBe('/files/');
    expect(getLiteralPrefix('/files/v:version')).toBe('/files/v');
    expect(getLiteralPrefix('/users{/:id}')).toBe('/users');
    expect(getLiteralPrefix('{/:lang}/users')).toBe('');
    expect(getLiteralPrefix('/:id')).toBe('/');
  });

  it('should return the whole path when it has no parameter', () => {
    expect(getLiteralPrefix('/users')).toBe('/users');
    expect(getLiteralPrefix('/')).toBe('/');
    expect(getLiteralPrefix('')).toBe('');
  });

  it('should unescape escaped characters', () => {
    expect(getLiteralPrefix('/a\\:b/:id')).toBe('/a:b/');
  });

  // A routing path holds a "%" as "%25"
  it('should end before a "%"', () => {
    expect(getLiteralPrefix('/a%b/:id')).toBe('/a');
    expect(getLiteralPrefix('/discounts/100%')).toBe('/discounts/100');
  });
});

describe('hasTextDecodedByRouter', () => {
  it.each([
    '/avatars/:user-avatar@2x.png',
    '/skus/:sku-color=:color',
    '/geo/:lat-:lng,:zoom',
    '/files/:name{.:ext}@2x',
    '/discounts/100%',
    '/a%b/:id',
  ])('should hold for "%s"', path => {
    expect(hasTextDecodedByRouter(path)).toBe(true);
  });

  it.each([
    '/users/@me',
    '/users/:id/@me',
    '/files/:name.:ext',
    '/users/:id-:slug',
    '/files/*path',
    '/users/:',
  ])('should not hold for "%s"', path => {
    expect(hasTextDecodedByRouter(path)).toBe(false);
  });
});

describe('getDecodedForms', () => {
  it('should decode the reserved characters but "/", then fold "%25"', () => {
    expect(getDecodedForms('/a/b%40c%3D%2Fd%2525')).toEqual([
      '/a/b@c=%2Fd%25',
      '/a/b@c=%2Fd%',
    ]);
  });
});

describe('getPrefixSkips', () => {
  it('should skip the entries that start with the same prefix', () => {
    expect(
      getPrefixSkips(['/a', '/a/b', '/a/c', '/b', undefined, '/b/x']),
    ).toEqual([3, 2, 3, 4, 5, 6]);
  });

  it('should never skip an entry without a prefix', () => {
    expect(getPrefixSkips(['/a', undefined, '/a/b'])).toEqual([1, 2, 3]);
    expect(getPrefixSkips([])).toEqual([]);
  });
});

describe('getRoutingPath', () => {
  it('should return a plain path as is, without the query string', () => {
    expect(getRoutingPath('/users')).toBe('/users');
    expect(getRoutingPath('/users?id=1&sort=asc')).toBe('/users');
  });

  it('should decode percent-encoded characters', () => {
    expect(getRoutingPath('/%61dmin')).toBe('/admin');
    expect(getRoutingPath('/caf%C3%A9?x=%20')).toBe('/café');
  });

  it('should keep reserved characters such as "/" encoded', () => {
    expect(getRoutingPath('/files/a%2Fb')).toBe('/files/a%2Fb');
    expect(getRoutingPath('/files/a%3Fb')).toBe('/files/a%3Fb');
  });

  it('should return the same path when applied twice', () => {
    for (const url of ['/a%2541', '/files/a%2Fb', '/%61dmin']) {
      const path = getRoutingPath(url);
      expect(getRoutingPath(path)).toBe(path);
    }
  });

  it('should resolve an absolute-form target to its path', () => {
    expect(getRoutingPath('http://example.com/users/1?x=1')).toBe('/users/1');
    expect(getRoutingPath('https://example.com:8443/%61dmin')).toBe('/admin');
    expect(getRoutingPath('http://example.com')).toBe('/');
    expect(getRoutingPath('http://example.com?x=1')).toBe('/');
  });

  it('should throw a URIError for a target with a fragment', () => {
    expect(() => getRoutingPath('/users#top')).toThrow(URIError);
    expect(() => getRoutingPath('http://example.com/users#top')).toThrow(
      URIError,
    );
  });

  it('should throw a URIError for malformed percent-encoding', () => {
    expect(() => getRoutingPath('/%E0%A4%A')).toThrow(URIError);
    expect(() => getRoutingPath('/users/%ZZ')).toThrow(URIError);
  });

  it('should throw a URIError for an absolute-form target without a host', () => {
    expect(() => getRoutingPath('http:///users')).toThrow(URIError);
    expect(() => getRoutingPath('http://')).toThrow(URIError);
  });
});

describe('getRawPrefixEnd', () => {
  it('should return where the prefix ends in the URL', () => {
    expect(getRawPrefixEnd('/static/app.js', '/static')).toBe(7);
    expect(getRawPrefixEnd('/api/v1/users', '/api/v1')).toBe(7);
  });

  it('should count path segments rather than characters', () => {
    // "/%73tatic" is the routing path "/static"
    const url = '/%73tatic/app.js';
    expect(url.slice(0, getRawPrefixEnd(url, '/static'))).toBe('/%73tatic');
  });

  it('should stop at the query string', () => {
    expect(getRawPrefixEnd('/static?v=1', '/static')).toBe(7);
  });

  it('should skip the scheme and host of an absolute-form target', () => {
    const url = 'http://example.com/static/app.js';
    expect(url.slice(getRawPrefixEnd(url, '/static'))).toBe('/app.js');
  });

  it('should end the host of an absolute-form target at its query', () => {
    // Routed as "/", like "http://example.com/?a=/users"
    const url = 'http://example.com?a=/users';
    expect(url.slice(getRawPrefixEnd(url, ''))).toBe('?a=/users');
  });
});
