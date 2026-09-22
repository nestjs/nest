import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Prefix that marks a signed cookie value, as written by Express'
 * `res.cookie(name, value, { signed: true })` and read by `cookie-parser`.
 */
export const SIGNED_COOKIE_PREFIX = 's:';

/**
 * Signs and verifies cookie values with HMAC-SHA256.
 *
 * The format is the one of the `cookie-signature` package (used by
 * `cookie-parser` and `express-session`): `value.signature`, where the
 * signature is the base64 digest without `=` padding. Signed values carry the
 * `s:` prefix, so cookies signed by `cookie-parser`/Express with the same
 * secret keep verifying, and so do un-prefixed values signed by
 * `@fastify/cookie`.
 *
 * With several secrets, values are signed with the first one and verified
 * against each of them (secret rotation).
 */
export class CookieSigner {
  private readonly secrets: string[];

  constructor(secret: string | string[]) {
    const secrets = Array.isArray(secret) ? secret : [secret];
    if (
      secrets.length === 0 ||
      secrets.some(item => typeof item !== 'string' || item.length === 0)
    ) {
      throw new TypeError(
        'The "cookies.secret" option must be a non-empty string or a non-empty array of non-empty strings.',
      );
    }
    this.secrets = [...secrets];
  }

  /**
   * Returns `s:<value>.<signature>`, signed with the first secret.
   */
  public sign(value: string): string {
    return `${SIGNED_COOKIE_PREFIX}${value}.${this.digest(value, this.secrets[0])}`;
  }

  /**
   * Returns the original value when `input` carries a valid signature for
   * any of the secrets, `undefined` otherwise. The `s:` prefix is optional.
   */
  public unsign(input: string): string | undefined {
    if (typeof input !== 'string') {
      return undefined;
    }
    const signed = input.startsWith(SIGNED_COOKIE_PREFIX)
      ? input.slice(SIGNED_COOKIE_PREFIX.length)
      : input;
    const dotIndex = signed.lastIndexOf('.');
    if (dotIndex === -1) {
      return undefined;
    }
    const value = signed.slice(0, dotIndex);
    const signature = Buffer.from(signed.slice(dotIndex + 1));

    let valid = false;
    for (const secret of this.secrets) {
      const expected = Buffer.from(this.digest(value, secret));
      // Every secret is checked, so timing does not reveal which one matched.
      if (
        expected.length === signature.length &&
        timingSafeEqual(expected, signature)
      ) {
        valid = true;
      }
    }
    return valid ? value : undefined;
  }

  private digest(value: string, secret: string): string {
    return createHmac('sha256', secret)
      .update(value)
      .digest('base64')
      .replace(/=+$/, '');
  }
}
