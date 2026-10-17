import { getRawPrefixEnd, getRoutingPath, loosen } from '../../router/utils.js';

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
});
