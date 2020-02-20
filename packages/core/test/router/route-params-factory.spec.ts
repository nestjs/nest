import { expect } from 'chai';
import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum';
import { RouteParamsFactory } from '../../router/route-params-factory';

describe('RouteParamsFactory', () => {
  let factory: RouteParamsFactory;
  beforeEach(() => {
    factory = new RouteParamsFactory();
  });
  describe('exchangeKeyForValue', () => {
    const res = {};
    const next = () => ({});
    const req = {
      ip: 'ip',
      session: null,
      body: {
        foo: 'bar',
      },
      headers: {
        foo: 'bar',
      },
      params: {
        foo: 'bar',
      },
      hosts: {
        foo: 'bar',
      },
      query: {
        foo: 'bar',
      },
      file: 'file',
      files: 'files',
    };
    describe('when key is', () => {
      const args = [null, { res, req, next }];
      describe(`RouteParamtypes.NEXT`, () => {
        it('should return next object', () => {
          expect(
            (factory as any).exchangeKeyForValue(RouteParamtypes.NEXT, ...args),
          ).to.be.eql(next);
        });
      });
      describe(`RouteParamtypes.RESPONSE`, () => {
        it('should return response object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.RESPONSE,
              ...args,
            ),
          ).to.be.eql(res);
        });
      });
      describe(`RouteParamtypes.REQUEST`, () => {
        it('should return request object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.REQUEST,
              ...args,
            ),
          ).to.be.eql(req);
        });
      });
      describe(`RouteParamtypes.BODY`, () => {
        it('should return body object', () => {
          expect(
            (factory as any).exchangeKeyForValue(RouteParamtypes.BODY, ...args),
          ).to.be.eql(req.body);
        });
      });
      describe(`RouteParamtypes.HEADERS`, () => {
        it('should return headers object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.HEADERS,
              ...args,
            ),
          ).to.be.eql(req.headers);
        });
      });
      describe(`RouteParamtypes.IP`, () => {
        it('should return ip property', () => {
          expect(
            (factory as any).exchangeKeyForValue(RouteParamtypes.IP, ...args),
          ).to.be.equal(req.ip);
        });
      });
      describe(`RouteParamtypes.SESSION`, () => {
        it('should return session object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.SESSION,
              ...args,
            ),
          ).to.be.eql(req.session);
        });
      });
      describe(`RouteParamtypes.QUERY`, () => {
        it('should return query object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.QUERY,
              ...args,
            ),
          ).to.be.eql(req.query);
        });
      });
      describe(`RouteParamtypes.PARAM`, () => {
        it('should return params object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.PARAM,
              ...args,
            ),
          ).to.be.eql(req.params);
        });
      });
      describe(`RouteParamtypes.HOST`, () => {
        it('should returns hosts object', () => {
          expect(
            (factory as any).exchangeKeyForValue(RouteParamtypes.HOST, ...args),
          ).to.be.eql(req.hosts);
        });
      });
      describe(`RouteParamtypes.FILE`, () => {
        it('should return file object', () => {
          expect(
            (factory as any).exchangeKeyForValue(RouteParamtypes.FILE, ...args),
          ).to.be.eql(req.file);
        });
      });
      describe(`RouteParamtypes.FILES`, () => {
        it('should return files object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.FILES,
              ...args,
            ),
          ).to.be.eql(req.files);
        });
      });
      describe('not available', () => {
        it('should return null', () => {
          expect((factory as any).exchangeKeyForValue(-1, ...args)).to.be.eql(
            null,
          );
        });
      });
    });
  });
});
