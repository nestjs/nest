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
          ).toEqual(next);
        });
      });
      describe(`RouteParamtypes.RESPONSE`, () => {
        it('should return response object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.RESPONSE,
              ...args,
            ),
          ).toEqual(res);
        });
      });
      describe(`RouteParamtypes.REQUEST`, () => {
        it('should return request object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.REQUEST,
              ...args,
            ),
          ).toEqual(req);
        });
      });
      describe(`RouteParamtypes.BODY`, () => {
        it('should return body object', () => {
          expect(
            (factory as any).exchangeKeyForValue(RouteParamtypes.BODY, ...args),
          ).toEqual(req.body);
        });
      });
      describe(`RouteParamtypes.HEADERS`, () => {
        it('should return headers object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.HEADERS,
              ...args,
            ),
          ).toEqual(req.headers);
        });
      });
      describe(`RouteParamtypes.IP`, () => {
        it('should return ip property', () => {
          expect(
            (factory as any).exchangeKeyForValue(RouteParamtypes.IP, ...args),
          ).toEqual(req.ip);
        });
      });
      describe(`RouteParamtypes.SESSION`, () => {
        it('should return session object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.SESSION,
              ...args,
            ),
          ).toEqual(req.session);
        });
      });
      describe(`RouteParamtypes.QUERY`, () => {
        it('should return query object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.QUERY,
              ...args,
            ),
          ).toEqual(req.query);
        });
      });
      describe(`RouteParamtypes.PARAM`, () => {
        it('should return params object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.PARAM,
              ...args,
            ),
          ).toEqual(req.params);
        });
      });
      describe(`RouteParamtypes.HOST`, () => {
        it('should return hosts object', () => {
          expect(
            (factory as any).exchangeKeyForValue(RouteParamtypes.HOST, ...args),
          ).toEqual(req.hosts);
        });
      });
      describe(`RouteParamtypes.FILE`, () => {
        it('should return file object', () => {
          expect(
            (factory as any).exchangeKeyForValue(RouteParamtypes.FILE, ...args),
          ).toEqual(req.file);
        });
      });
      describe(`RouteParamtypes.FILES`, () => {
        it('should return files object', () => {
          expect(
            (factory as any).exchangeKeyForValue(
              RouteParamtypes.FILES,
              ...args,
            ),
          ).toEqual(req.files);
        });
      });
      describe('not available', () => {
        it('should return null', () => {
          expect((factory as any).exchangeKeyForValue(-1, ...args)).toEqual(
            null,
          );
        });
      });
    });
  });
});
