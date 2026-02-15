import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum.js';
import { RouteParamsFactory } from '../../router/route-params-factory.js';

describe('RouteParamsFactory', () => {
  let factory: RouteParamsFactory;
  let untypedFactory: any;

  beforeEach(() => {
    factory = new RouteParamsFactory();
    untypedFactory = factory as any;
  });

  describe('exchangeKeyForValue', () => {
    const res = {};
    const next = () => ({});
    const req = {
      ip: 'ip',
      session: null,
      rawBody: Buffer.from('{"foo":"bar"}'),
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
            untypedFactory.exchangeKeyForValue(RouteParamtypes.NEXT, ...args),
          ).toEqual(next);
        });
      });
      describe(`RouteParamtypes.RESPONSE`, () => {
        it('should return response object', () => {
          expect(
            untypedFactory.exchangeKeyForValue(
              RouteParamtypes.RESPONSE,
              ...args,
            ),
          ).toEqual(res);
        });
      });
      describe(`RouteParamtypes.REQUEST`, () => {
        it('should return request object', () => {
          expect(
            untypedFactory.exchangeKeyForValue(
              RouteParamtypes.REQUEST,
              ...args,
            ),
          ).toEqual(req);
        });
      });
      describe(`RouteParamtypes.BODY`, () => {
        it('should return body object', () => {
          expect(
            untypedFactory.exchangeKeyForValue(RouteParamtypes.BODY, ...args),
          ).toEqual(req.body);
        });
      });
      describe(`RouteParamtypes.RAW_BODY`, () => {
        it('should return rawBody buffer', () => {
          expect(
            untypedFactory.exchangeKeyForValue(
              RouteParamtypes.RAW_BODY,
              ...args,
            ),
          ).toEqual(req.rawBody);
        });
      });
      describe(`RouteParamtypes.HEADERS`, () => {
        it('should return headers object', () => {
          expect(
            untypedFactory.exchangeKeyForValue(
              RouteParamtypes.HEADERS,
              ...args,
            ),
          ).toEqual(req.headers);
        });
      });
      describe(`RouteParamtypes.IP`, () => {
        it('should return ip property', () => {
          expect(
            untypedFactory.exchangeKeyForValue(RouteParamtypes.IP, ...args),
          ).toBe(req.ip);
        });
      });
      describe(`RouteParamtypes.SESSION`, () => {
        it('should return session object', () => {
          expect(
            untypedFactory.exchangeKeyForValue(
              RouteParamtypes.SESSION,
              ...args,
            ),
          ).toEqual(req.session);
        });
      });
      describe(`RouteParamtypes.QUERY`, () => {
        it('should return query object', () => {
          expect(
            untypedFactory.exchangeKeyForValue(RouteParamtypes.QUERY, ...args),
          ).toEqual(req.query);
        });
      });
      describe(`RouteParamtypes.PARAM`, () => {
        it('should return params object', () => {
          expect(
            untypedFactory.exchangeKeyForValue(RouteParamtypes.PARAM, ...args),
          ).toEqual(req.params);
        });
      });
      describe(`RouteParamtypes.HOST`, () => {
        it('should return hosts object', () => {
          expect(
            untypedFactory.exchangeKeyForValue(RouteParamtypes.HOST, ...args),
          ).toEqual(req.hosts);
        });
      });
      describe(`RouteParamtypes.FILE`, () => {
        it('should return file object', () => {
          expect(
            untypedFactory.exchangeKeyForValue(RouteParamtypes.FILE, ...args),
          ).toEqual(req.file);
        });
      });
      describe(`RouteParamtypes.FILES`, () => {
        it('should return files object', () => {
          expect(
            untypedFactory.exchangeKeyForValue(RouteParamtypes.FILES, ...args),
          ).toEqual(req.files);
        });
      });
      describe('not available', () => {
        it('should return null', () => {
          expect(untypedFactory.exchangeKeyForValue(-1, ...args)).toEqual(null);
        });
      });
    });
  });
});
