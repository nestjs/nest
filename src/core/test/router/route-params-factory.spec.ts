import {expect} from 'chai';
import {RouteParamtypes} from '../../../common/enums/route-paramtypes.enum';
import {RouteParamsFactory} from '../../router/route-params-factory';

describe('RouteParamsFactory', () => {
  let factory: RouteParamsFactory;
  beforeEach(() => { factory = new RouteParamsFactory(); });
  describe('exchangeKeyForValue', () => {
    const res = {};
    const next = () => ({});
    const req = {
      session : null,
      body : {
        foo : 'bar',
      },
      headers : {
        foo : 'bar',
      },
      params : {
        foo : 'bar',
      },
      query : {
        foo : 'bar',
      },
    };
    describe('when key is', () => {
      const args = [ null, {res, req, next} ];
      describe(`RouteParamtypes.NEXT`, () => {
        it('should returns next object', () => {
          expect((factory as any)
                     .exchangeKeyForValue(RouteParamtypes.NEXT, ...args))
              .to.be.eql(next);
        });
      });
      describe(`RouteParamtypes.RESPONSE`, () => {
        it('should returns response object', () => {
          expect((factory as any)
                     .exchangeKeyForValue(RouteParamtypes.RESPONSE, ...args))
              .to.be.eql(res);
        });
      });
      describe(`RouteParamtypes.REQUEST`, () => {
        it('should returns request object', () => {
          expect((factory as any)
                     .exchangeKeyForValue(RouteParamtypes.REQUEST, ...args))
              .to.be.eql(req);
        });
      });
      describe(`RouteParamtypes.BODY`, () => {
        it('should returns body object', () => {
          expect((factory as any)
                     .exchangeKeyForValue(RouteParamtypes.BODY, ...args))
              .to.be.eql(req.body);
        });
      });
      describe(`RouteParamtypes.HEADERS`, () => {
        it('should returns headers object', () => {
          expect((factory as any)
                     .exchangeKeyForValue(RouteParamtypes.HEADERS, ...args))
              .to.be.eql(req.headers);
        });
      });
      describe(`RouteParamtypes.SESSION`, () => {
        it('should returns session object', () => {
          expect((factory as any)
                     .exchangeKeyForValue(RouteParamtypes.SESSION, ...args))
              .to.be.eql(req.session);
        });
      });
      describe(`RouteParamtypes.QUERY`, () => {
        it('should returns query object', () => {
          expect((factory as any)
                     .exchangeKeyForValue(RouteParamtypes.QUERY, ...args))
              .to.be.eql(req.query);
        });
      });
      describe(`RouteParamtypes.PARAM`, () => {
        it('should returns params object', () => {
          expect((factory as any)
                     .exchangeKeyForValue(RouteParamtypes.PARAM, ...args))
              .to.be.eql(req.params);
        });
      });
      describe('not available', () => {
        it('should returns null', () => {
          expect((factory as any).exchangeKeyForValue(-1, ...args))
              .to.be.eql(null);
        });
      });
    });
  });
});