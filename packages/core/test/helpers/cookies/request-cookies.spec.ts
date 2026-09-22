import { CookieSigner } from '../../../helpers/cookies/cookie-signer.js';
import {
  getRequestCookie,
  getRequestCookies,
  getRequestSignedCookie,
  getRequestSignedCookies,
} from '../../../helpers/cookies/request-cookies.js';

describe('request cookies', () => {
  const signer = new CookieSigner('secret');

  describe('getRequestCookies', () => {
    it('should parse the Cookie header', () => {
      const req = { headers: { cookie: 'a=1; b=2' } };
      expect({ ...getRequestCookies(req) }).toEqual({ a: '1', b: '2' });
    });

    it('should parse the header once per request', () => {
      const req = { headers: { cookie: 'a=1' } };
      const first = getRequestCookies(req);
      req.headers.cookie = 'a=2';
      expect(getRequestCookies(req)).toBe(first);
      expect(getRequestCookies({ headers: { cookie: 'a=2' } }).a).toBe('2');
    });

    it('should prefer req.cookies populated by a middleware', () => {
      const cookies = { a: 'from-middleware' };
      const req = { cookies, headers: { cookie: 'a=from-header' } };
      expect(getRequestCookies(req)).toBe(cookies);
    });

    it('should handle requests without headers', () => {
      expect(Object.keys(getRequestCookies({}))).toEqual([]);
    });
  });

  describe('getRequestCookie', () => {
    it('should return a single cookie or undefined', () => {
      const req = { headers: { cookie: 'a=1' } };
      expect(getRequestCookie(req, 'a')).toBe('1');
      expect(getRequestCookie(req, 'b')).toBeUndefined();
    });

    it('should not resolve inherited members of req.cookies', () => {
      const req = { cookies: { a: '1' }, headers: {} };
      expect(getRequestCookie(req, 'constructor')).toBeUndefined();
      expect(getRequestCookie(req, '__proto__')).toBeUndefined();
      expect(getRequestCookie(req, 'toString')).toBeUndefined();
    });
  });

  describe('getRequestSignedCookies', () => {
    const header = [
      `uid=${encodeURIComponent(signer.sign('42'))}`,
      `forged=${encodeURIComponent('s:42.bogus')}`,
      'plain=hello',
    ].join('; ');

    it('should return only the cookies whose signature verifies', () => {
      const req = { headers: { cookie: header } };
      expect({ ...getRequestSignedCookies(req, signer) }).toEqual({
        uid: '42',
      });
    });

    it('should return a single signed cookie, undefined when invalid', () => {
      const req = { headers: { cookie: header } };
      expect(getRequestSignedCookie(req, 'uid', signer)).toBe('42');
      expect(getRequestSignedCookie(req, 'forged', signer)).toBeUndefined();
      expect(getRequestSignedCookie(req, 'plain', signer)).toBeUndefined();
      expect(getRequestSignedCookie(req, 'missing', signer)).toBeUndefined();
    });

    it('should only verify the first occurrence of a duplicated name', () => {
      const valid = encodeURIComponent(signer.sign('42'));
      expect(
        getRequestSignedCookie(
          { headers: { cookie: `uid=s%3A1.forged; uid=${valid}` } },
          'uid',
          signer,
        ),
      ).toBeUndefined();
      expect(
        getRequestSignedCookie(
          { headers: { cookie: `uid=${valid}; uid=s%3A1.forged` } },
          'uid',
          signer,
        ),
      ).toBe('42');
    });

    it('should verify the raw header even when req.cookies is populated', () => {
      // cookie-parser removes signed cookies from req.cookies.
      const req = { cookies: { plain: 'hello' }, headers: { cookie: header } };
      expect(getRequestSignedCookie(req, 'uid', signer)).toBe('42');
    });

    it('should fall back to req.signedCookies without a signer', () => {
      const req = {
        signedCookies: { uid: '42', forged: false, prefs: { theme: 'dark' } },
        headers: { cookie: header },
      };
      expect({ ...getRequestSignedCookies(req, undefined) }).toEqual({
        uid: '42',
        prefs: { theme: 'dark' },
      });
      expect(getRequestSignedCookie(req, 'uid', undefined)).toBe('42');
      expect(getRequestSignedCookie(req, 'forged', undefined)).toBeUndefined();
    });

    it('should throw without a signer or req.signedCookies', () => {
      const req = { headers: { cookie: header } };
      expect(() => getRequestSignedCookies(req, undefined)).toThrow(
        /no cookie secret is configured/,
      );
      expect(() => getRequestSignedCookie(req, 'uid', undefined)).toThrow(
        /no cookie secret is configured/,
      );
    });
  });
});
