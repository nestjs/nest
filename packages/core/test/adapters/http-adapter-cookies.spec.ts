import { CookieSigner } from '../../helpers/cookies/cookie-signer.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

describe('AbstractHttpAdapter cookies', () => {
  let adapter: NoopHttpAdapter;
  let appendHeader: ReturnType<typeof vi.spyOn>;
  const response = {};

  beforeEach(() => {
    adapter = new NoopHttpAdapter({});
    appendHeader = vi.spyOn(adapter, 'appendHeader');
  });

  describe('setCookie', () => {
    it('should append one Set-Cookie header per cookie', () => {
      adapter.setCookie(response, 'a', '1');
      adapter.setCookie(response, 'b', '2', { httpOnly: true });

      expect(appendHeader.mock.calls).toEqual([
        [response, 'Set-Cookie', 'a=1; Path=/'],
        [response, 'Set-Cookie', 'b=2; Path=/; HttpOnly'],
      ]);
    });

    it('should sign the value with the configured signer', () => {
      const signer = new CookieSigner(['new', 'old']);
      adapter.setCookieSigner(signer);
      adapter.setCookie(response, 'uid', '42', { signed: true });

      const header = appendHeader.mock.calls[0][2] as string;
      const value = decodeURIComponent(
        header.split(';')[0].slice('uid='.length),
      );
      expect(value.startsWith('s:42.')).toBe(true);
      expect(signer.unsign(value)).toBe('42');
      expect(new CookieSigner('new').unsign(value)).toBe('42');
    });

    it('should throw when signing without a secret', () => {
      expect(() =>
        adapter.setCookie(response, 'uid', '42', { signed: true }),
      ).toThrow(/no cookie secret is configured/);
      expect(appendHeader).not.toHaveBeenCalled();
    });

    it('should reject a non-string value to sign', () => {
      adapter.setCookieSigner(new CookieSigner('secret'));
      expect(() =>
        adapter.setCookie(response, 'uid', 42 as any, { signed: true }),
      ).toThrow(TypeError);
      expect(appendHeader).not.toHaveBeenCalled();
    });

    it('should reject SameSite=None and Partitioned cookies without Secure', () => {
      expect(() =>
        adapter.setCookie(response, 'a', 'v', { sameSite: 'none' }),
      ).toThrow(TypeError);
      expect(() =>
        adapter.setCookie(response, 'a', 'v', { partitioned: true }),
      ).toThrow(TypeError);
      expect(appendHeader).not.toHaveBeenCalled();

      adapter.setCookie(response, 'a', 'v', {
        sameSite: 'none',
        partitioned: true,
        secure: true,
      });
      expect(appendHeader).toHaveBeenCalledWith(
        response,
        'Set-Cookie',
        'a=v; Path=/; Secure; Partitioned; SameSite=None',
      );
    });

    it('should reject header injection before writing anything', () => {
      expect(() => adapter.setCookie(response, 'a\r\nX-Injected', 'v')).toThrow(
        TypeError,
      );
      expect(() =>
        adapter.setCookie(response, 'a', 'v', { path: '/; Domain=evil.com' }),
      ).toThrow(TypeError);
      expect(() =>
        adapter.setCookie(response, 'a', 'v', { domain: 'x.com\r\nX: y' }),
      ).toThrow(TypeError);
      expect(appendHeader).not.toHaveBeenCalled();
    });

    it('should neutralize CR, LF and ";" in values by percent-encoding them', () => {
      adapter.setCookie(response, 'a', 'v\r\nX-Injected: 1; Domain=evil');
      expect(appendHeader).toHaveBeenCalledWith(
        response,
        'Set-Cookie',
        'a=v%0D%0AX-Injected%3A%201%3B%20Domain%3Devil; Path=/',
      );
    });
  });

  describe('clearCookie', () => {
    it('should default the path to "/"', () => {
      adapter.clearCookie(response, 'sid');
      expect(appendHeader).toHaveBeenCalledWith(
        response,
        'Set-Cookie',
        'sid=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      );
    });

    it('should append an expired, empty cookie', () => {
      adapter.clearCookie(response, 'sid', {
        path: '/app',
        domain: 'example.com',
        maxAge: 1000,
        expires: new Date(Date.UTC(2030, 0, 1)),
        signed: true,
      });
      expect(appendHeader).toHaveBeenCalledWith(
        response,
        'Set-Cookie',
        'sid=; Path=/app; Domain=example.com; Max-Age=0; ' +
          'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      );
    });
  });
});
