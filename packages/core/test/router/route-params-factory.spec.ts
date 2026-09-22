import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum.js';
import { ApplicationConfig } from '../../application-config.js';
import { CookieSigner } from '../../helpers/cookies/cookie-signer.js';
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
      describe(`RouteParamtypes.COOKIES`, () => {
        const cookieReq = () => ({
          headers: { cookie: 'theme=dark; lang=en' },
        });

        it('should return all cookies', () => {
          expect({
            ...untypedFactory.exchangeKeyForValue(
              RouteParamtypes.COOKIES,
              null,
              {
                req: cookieReq(),
                res,
                next,
              },
            ),
          }).toEqual({ theme: 'dark', lang: 'en' });
        });
        it('should return a single cookie', () => {
          expect(
            untypedFactory.exchangeKeyForValue(
              RouteParamtypes.COOKIES,
              'theme',
              {
                req: cookieReq(),
                res,
                next,
              },
            ),
          ).toEqual('dark');
        });
        it('should use req.cookies when a middleware populated it', () => {
          const cookies = { theme: 'light' };
          expect(
            untypedFactory.exchangeKeyForValue(RouteParamtypes.COOKIES, null, {
              req: { ...cookieReq(), cookies },
              res,
              next,
            }),
          ).toBe(cookies);
        });
      });
      describe(`RouteParamtypes.SIGNED_COOKIES`, () => {
        const signer = new CookieSigner('secret');
        const signedReq = () => ({
          headers: {
            cookie: `uid=${encodeURIComponent(signer.sign('42'))}; forged=s%3A1.x`,
          },
        });
        let signedFactory: any;

        beforeEach(() => {
          const config = new ApplicationConfig();
          config.setCookieSigner(signer);
          signedFactory = new RouteParamsFactory(config);
        });

        it('should return the verified signed cookies', () => {
          expect({
            ...signedFactory.exchangeKeyForValue(
              RouteParamtypes.SIGNED_COOKIES,
              null,
              { req: signedReq(), res, next },
            ),
          }).toEqual({ uid: '42' });
        });
        it('should return a single signed cookie, undefined when forged', () => {
          const req = signedReq();
          expect(
            signedFactory.exchangeKeyForValue(
              RouteParamtypes.SIGNED_COOKIES,
              'uid',
              { req, res, next },
            ),
          ).toEqual('42');
          expect(
            signedFactory.exchangeKeyForValue(
              RouteParamtypes.SIGNED_COOKIES,
              'forged',
              { req, res, next },
            ),
          ).toBeUndefined();
        });
        it('should throw when no secret is configured', () => {
          expect(() =>
            untypedFactory.exchangeKeyForValue(
              RouteParamtypes.SIGNED_COOKIES,
              'uid',
              { req: signedReq(), res, next },
            ),
          ).toThrow(/no cookie secret is configured/);
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
