import { createRequire } from 'module';
import { CookieSigner } from '../../../helpers/cookies/cookie-signer.js';

const require = createRequire(import.meta.url);
// Reference implementation used by cookie-parser and express-session. It is
// only loaded by this spec (it is already in the lockfile through express),
// never at runtime.
const cookieSignature = require('cookie-signature');

describe('CookieSigner', () => {
  it('should reject missing or empty secrets', () => {
    for (const secret of ['', [], [''], ['a', ''], [1], undefined]) {
      expect(() => new CookieSigner(secret as any)).toThrow(TypeError);
    }
  });

  it('should produce the cookie-signature format with the "s:" prefix', () => {
    const signer = new CookieSigner('secret');
    expect(signer.sign('value')).toBe(
      `s:${cookieSignature.sign('value', 'secret')}`,
    );
    expect(signer.sign('value')).not.toMatch(/=$/);
  });

  it('should round-trip values, including dots and non-ASCII', () => {
    const signer = new CookieSigner('secret');
    for (const value of ['', 'a.b.c', 'h\u00e9llo', 's:nested']) {
      expect(signer.unsign(signer.sign(value))).toBe(value);
    }
  });

  it('should verify values signed by cookie-signature, with or without the prefix', () => {
    const signer = new CookieSigner('secret');
    const signed = cookieSignature.sign('user-42', 'secret');
    expect(signer.unsign(`s:${signed}`)).toBe('user-42');
    expect(signer.unsign(signed)).toBe('user-42');
  });

  it('should produce values that cookie-signature verifies', () => {
    const signed = new CookieSigner('secret').sign('user-42');
    expect(cookieSignature.unsign(signed.slice(2), 'secret')).toBe('user-42');
  });

  it('should reject tampered values and signatures', () => {
    const signer = new CookieSigner('secret');
    const signed = signer.sign('user-42');
    expect(signer.unsign(signed.replace('user-42', 'user-43'))).toBeUndefined();
    expect(signer.unsign(signed.slice(0, -1))).toBeUndefined();
    expect(signer.unsign(`${signed}A`)).toBeUndefined();
    expect(signer.unsign('s:user-42')).toBeUndefined();
    expect(signer.unsign('user-42')).toBeUndefined();
    expect(signer.unsign('')).toBeUndefined();
    expect(signer.unsign(undefined as any)).toBeUndefined();
  });

  it('should reject values signed with another secret', () => {
    const signed = new CookieSigner('other').sign('user-42');
    expect(new CookieSigner('secret').unsign(signed)).toBeUndefined();
  });

  it('should sign with the first secret and verify with all of them', () => {
    const previous = new CookieSigner('old');
    const rotated = new CookieSigner(['new', 'old']);
    expect(rotated.unsign(previous.sign('v'))).toBe('v');
    expect(rotated.sign('v')).toBe(new CookieSigner('new').sign('v'));
    expect(previous.unsign(rotated.sign('v'))).toBeUndefined();
  });

  it('should not be affected by mutating the secrets array afterwards', () => {
    const secrets = ['a'];
    const signer = new CookieSigner(secrets);
    const signed = signer.sign('v');
    secrets[0] = 'b';
    expect(signer.unsign(signed)).toBe('v');
  });
});
