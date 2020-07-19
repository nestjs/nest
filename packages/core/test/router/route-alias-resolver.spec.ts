import { RouteAliasResolver } from '../../router/route-alias-resolver';
import { expect } from 'chai';

describe('RouteAliasResolver', () => {

  let aliasResolver: RouteAliasResolver;

  beforeEach(() => {
    aliasResolver = new RouteAliasResolver();
  });

  describe('registering aliases', () => {
    it('should throw if attempting to override alias', () => {
      aliasResolver.register('foo', '', ['bar']);
      expect(() => aliasResolver.register('foo', '', ['bar'])).to.throw
    });
  });

  describe('resolving aliases', () => {
    it('should include base path in resolution', () => {
      const alias = 'foo';
      aliasResolver.register(alias, '/bar', ['baz']);
      const resolver = aliasResolver.createResolveFn();
      expect(resolver(alias)).to.be.eq('/bar/baz')
    });

    it('should interpolate route parameters', () => {
      const alias = 'foo';
      aliasResolver.register(alias, '/bar', ['baz/:id']);
      const resolver = aliasResolver.createResolveFn();
      expect(resolver(alias, { id: 1 })).to.be.eq('/bar/baz/1')
    });

    it('should leave route parameter declaration if no value given', () => {
      const alias = 'foo';
      aliasResolver.register(alias, '/bar', ['baz/:id']);
      const resolver = aliasResolver.createResolveFn();
      expect(resolver(alias)).to.be.eq('/bar/baz/:id')
    });

    it('should resolve aliases with Symbols', () => {
      const alias = Symbol('foo');
      aliasResolver.register(alias, '/bar', ['baz']);
      const resolver = aliasResolver.createResolveFn();
      expect(resolver(alias)).to.be.eq('/bar/baz')
    });
  });
});