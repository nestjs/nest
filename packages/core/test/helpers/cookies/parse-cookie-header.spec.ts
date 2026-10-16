import { parseCookieHeader } from '../../../helpers/cookies/parse-cookie-header.js';

describe('parseCookieHeader', () => {
  it('should return an empty prototype-less object for a missing header', () => {
    for (const header of [undefined, null, '']) {
      const cookies = parseCookieHeader(header);
      expect(Object.keys(cookies)).toEqual([]);
      expect(Object.getPrototypeOf(cookies)).toBeNull();
    }
  });

  it('should split pairs on ";" and trim names and values', () => {
    expect({ ...parseCookieHeader(' a = 1 ;b=2;  c=3 ') }).toEqual({
      a: '1',
      b: '2',
      c: '3',
    });
  });

  it('should trim tabs around names and values', () => {
    expect({ ...parseCookieHeader('\ta\t=\t1\t;\t b \t= \t2') }).toEqual({
      a: '1',
      b: '2',
    });
  });

  it('should trim only spaces and tabs, as user agents do', () => {
    // A user agent stores "\u00a0__Host-id" as a cookie without the prefix,
    // so anyone who can set cookies for the domain can set it. Trimming the
    // no-break space would let it pass for, and shadow, "__Host-id".
    for (const char of ['\u00a0', '\u000b', '\u000c', '\ufeff', '\u2028']) {
      const cookies = parseCookieHeader(
        `${char}__Host-id=forged; __Host-id=genuine; v=${char}1${char}`,
      );
      expect(cookies['__Host-id']).toBe('genuine');
      expect(cookies[`${char}__Host-id`]).toBe('forged');
      expect(cookies.v).toBe(`${char}1${char}`);
    }
  });

  it('should split each pair on the first "=" only', () => {
    const cookies = parseCookieHeader('token=abc==; q=a=b');
    expect(cookies.token).toBe('abc==');
    expect(cookies.q).toBe('a=b');
  });

  it('should keep the first occurrence of a duplicated name', () => {
    expect(parseCookieHeader('id=first; id=second').id).toBe('first');
  });

  it('should percent-decode values', () => {
    expect(parseCookieHeader('v=hello%20world%3B%C3%A9').v).toBe(
      'hello world;\u00e9',
    );
  });

  it('should fall back to the raw value when percent-decoding fails', () => {
    const cookies = parseCookieHeader('v=100%; w=%E0%A4%A');
    expect(cookies.v).toBe('100%');
    expect(cookies.w).toBe('%E0%A4%A');
  });

  it('should unquote double-quoted values', () => {
    expect(parseCookieHeader('v="quoted"').v).toBe('quoted');
    expect(parseCookieHeader('v="').v).toBe('"');
  });

  it('should ignore pairs without "=" or with an empty name', () => {
    expect({ ...parseCookieHeader('flag; =orphan; a=1;;') }).toEqual({
      a: '1',
    });
  });

  it('should keep empty values', () => {
    expect(parseCookieHeader('empty=').empty).toBe('');
  });

  it('should store prototype member names as plain entries', () => {
    const cookies = parseCookieHeader(
      '__proto__=polluted; constructor=ctor; toString=str',
    );
    expect(Object.getPrototypeOf(cookies)).toBeNull();
    expect(Object.keys(cookies)).toEqual([
      '__proto__',
      'constructor',
      'toString',
    ]);
    expect(cookies['__proto__']).toBe('polluted');
    expect(cookies.constructor).toBe('ctor');
    expect(cookies.toString).toBe('str');
  });

  it('should not resolve prototype members for names that were not sent', () => {
    const cookies = parseCookieHeader('a=1');
    expect(cookies.constructor).toBeUndefined();
    expect(cookies['__proto__']).toBeUndefined();
    expect('toString' in cookies).toBe(false);
  });

  it('should join multiple header values', () => {
    expect({ ...parseCookieHeader(['a=1', 'b=2']) }).toEqual({
      a: '1',
      b: '2',
    });
  });
});
