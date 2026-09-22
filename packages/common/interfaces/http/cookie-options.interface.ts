/**
 * Attributes of a `Set-Cookie` header written by `HttpServer.setCookie()` and
 * `HttpServer.clearCookie()`.
 *
 * @see [RFC 6265, section 4.1](https://datatracker.ietf.org/doc/html/rfc6265#section-4.1)
 *
 * @publicApi
 */
export interface CookieSerializeOptions {
  /**
   * `Path` attribute.
   *
   * @default '/'
   */
  path?: string;
  /**
   * `Domain` attribute. Omitted by default, which makes the cookie host-only.
   */
  domain?: string;
  /**
   * `Max-Age` attribute, in **seconds**, as in RFC 6265 and `@fastify/cookie`.
   * Must be an integer.
   *
   * **Not milliseconds**: Express' `res.cookie()` takes `maxAge` in
   * milliseconds, so a value carried over from it would make the cookie live
   * 1000 times longer. For one day, pass `60 * 60 * 24`.
   */
  maxAge?: number;
  /**
   * `Expires` attribute. Browsers give precedence to `maxAge` when both are
   * set.
   */
  expires?: Date;
  /**
   * `HttpOnly` attribute.
   */
  httpOnly?: boolean;
  /**
   * `Secure` attribute.
   */
  secure?: boolean;
  /**
   * `SameSite` attribute. `'none'` requires `secure: true`, since browsers
   * reject `SameSite=None` cookies that are not `Secure`.
   */
  sameSite?: 'strict' | 'lax' | 'none';
  /**
   * `Partitioned` attribute (CHIPS). Requires `secure: true`, since browsers
   * reject partitioned cookies that are not `Secure`.
   */
  partitioned?: boolean;
  /**
   * `Priority` attribute (non-standard, honored by Chromium).
   */
  priority?: 'low' | 'medium' | 'high';
  /**
   * Whether to sign the value with the first secret configured through the
   * `cookies.secret` application option. Signed cookies are read with the
   * `@SignedCookies()` decorator.
   *
   * @default false
   */
  signed?: boolean;
}

/**
 * The `cookies` option of `NestFactory.create()`.
 *
 * @publicApi
 */
export interface CookiesOptions {
  /**
   * Secret (or secrets) used to sign and verify cookies. When an array is
   * given, cookies are signed with the first secret and verified against all
   * of them, which allows rotating secrets without invalidating cookies
   * signed with a previous one. An empty string, an empty array or an empty
   * entry throws when the application is created.
   */
  secret?: string | string[];
}
