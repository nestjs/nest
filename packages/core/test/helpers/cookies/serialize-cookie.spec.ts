import { serializeCookie } from '../../../helpers/cookies/serialize-cookie.js';

describe('serializeCookie', () => {
  it('should default the path to "/"', () => {
    expect(serializeCookie('a', 'b')).toBe('a=b; Path=/');
  });

  it('should percent-encode the value', () => {
    expect(serializeCookie('a', 'x y;z\r\n=\u00e9')).toBe(
      'a=x%20y%3Bz%0D%0A%3D%C3%A9; Path=/',
    );
  });

  it('should only emit RFC 6265 cookie-octets in the value', () => {
    // %x21 / %x23-2B / %x2D-3A / %x3C-5B / %x5D-7E
    const cookieOctets = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/;
    let value = '';
    for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
      if (codePoint < 0xd800 || codePoint > 0xdfff) {
        value += String.fromCodePoint(codePoint);
      }
    }
    const header = serializeCookie('a', value);
    const encoded = header.slice('a='.length, header.indexOf('; Path=/'));
    expect(cookieOctets.test(encoded)).toBe(true);
    expect(decodeURIComponent(encoded)).toBe(value);
  });

  it('should reject values that are not well-formed strings', () => {
    expect(() => serializeCookie('a', 'x\ud800y')).toThrow(TypeError);
  });

  it('should serialize every attribute', () => {
    expect(
      serializeCookie('sid', 'v', {
        path: '/app',
        domain: '.example.com',
        maxAge: 3600,
        expires: new Date(Date.UTC(2030, 0, 1)),
        httpOnly: true,
        secure: true,
        partitioned: true,
        priority: 'high',
        sameSite: 'lax',
      }),
    ).toBe(
      'sid=v; Path=/app; Domain=.example.com; Max-Age=3600; ' +
        'Expires=Tue, 01 Jan 2030 00:00:00 GMT; HttpOnly; Secure; ' +
        'Partitioned; Priority=High; SameSite=Lax',
    );
  });

  it('should normalize sameSite and priority casing', () => {
    expect(
      serializeCookie('a', 'b', {
        sameSite: 'STRICT' as any,
        priority: 'Low' as any,
      }),
    ).toBe('a=b; Path=/; Priority=Low; SameSite=Strict');
    expect(serializeCookie('a', 'b', { sameSite: 'none', secure: true })).toBe(
      'a=b; Path=/; Secure; SameSite=None',
    );
  });

  it('should omit false boolean attributes', () => {
    expect(
      serializeCookie('a', 'b', {
        httpOnly: false,
        secure: false,
        partitioned: false,
      }),
    ).toBe('a=b; Path=/');
  });

  it.each([
    '',
    'a b',
    'a;b',
    'a=b',
    'a\r\nSet-Cookie: x',
    'a,b',
    '\u00e9',
    '(a)',
  ])('should reject the invalid name %j', name => {
    expect(() => serializeCookie(name, 'v')).toThrow(TypeError);
  });

  it('should reject non-string values', () => {
    expect(() => serializeCookie('a', 1 as any)).toThrow(TypeError);
    expect(() => serializeCookie('a', undefined as any)).toThrow(TypeError);
  });

  it.each(['/a;b', '/a\r\nSet-Cookie: x=y', '/a\nb', '/\u00e9', '/\u0000'])(
    'should reject the invalid path %j',
    path => {
      expect(() => serializeCookie('a', 'b', { path })).toThrow(TypeError);
    },
  );

  it.each([
    'example.com; HttpOnly',
    'example.com\r\n',
    'exa mple.com',
    '-example.com',
    'example..com',
    '',
  ])('should reject the invalid domain %j', domain => {
    expect(() => serializeCookie('a', 'b', { domain })).toThrow(TypeError);
  });

  it('should accept valid domains', () => {
    for (const domain of ['localhost', 'sub.example.com', '127.0.0.1']) {
      expect(serializeCookie('a', 'b', { domain })).toContain(
        `; Domain=${domain}`,
      );
    }
  });

  it('should reject a non-integer maxAge', () => {
    for (const maxAge of [1.5, NaN, Infinity, 1e21, '10' as any]) {
      expect(() => serializeCookie('a', 'b', { maxAge })).toThrow(TypeError);
    }
    expect(serializeCookie('a', 'b', { maxAge: 0 })).toContain('; Max-Age=0');
  });

  it('should reject an invalid expires date', () => {
    expect(() =>
      serializeCookie('a', 'b', { expires: new Date('invalid') }),
    ).toThrow(TypeError);
    expect(() =>
      serializeCookie('a', 'b', { expires: 'tomorrow' as any }),
    ).toThrow(TypeError);
  });

  it('should reject unknown sameSite and priority values', () => {
    expect(() =>
      serializeCookie('a', 'b', { sameSite: 'Lax; Domain=evil' as any }),
    ).toThrow(TypeError);
    expect(() =>
      serializeCookie('a', 'b', { priority: 'urgent' as any }),
    ).toThrow(TypeError);
  });

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
    'should reject the inherited property name %j as sameSite or priority',
    value => {
      expect(() =>
        serializeCookie('a', 'b', { sameSite: value as any, secure: true }),
      ).toThrow(TypeError);
      expect(() =>
        serializeCookie('a', 'b', { priority: value as any }),
      ).toThrow(TypeError);
    },
  );

  it('should require "secure" for sameSite "none", which browsers reject otherwise', () => {
    expect(() => serializeCookie('a', 'b', { sameSite: 'none' })).toThrow(
      /requires "secure: true"/,
    );
    expect(() =>
      serializeCookie('a', 'b', { sameSite: 'NONE' as any, secure: false }),
    ).toThrow(TypeError);
    expect(serializeCookie('a', 'b', { sameSite: 'lax' })).toBe(
      'a=b; Path=/; SameSite=Lax',
    );
  });

  it('should require "secure" for partitioned cookies, which browsers reject otherwise', () => {
    expect(() => serializeCookie('a', 'b', { partitioned: true })).toThrow(
      /requires "secure: true"/,
    );
    expect(serializeCookie('a', 'b', { partitioned: true, secure: true })).toBe(
      'a=b; Path=/; Secure; Partitioned',
    );
  });
});
