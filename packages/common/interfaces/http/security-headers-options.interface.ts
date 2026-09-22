/**
 * Value of a Content-Security-Policy directive:
 *
 * - a string or a list of strings: the directive's source expressions
 *   (keywords must be quoted, e.g. `"'self'"`);
 * - `true` or an empty list: a directive without value (e.g.
 *   `upgrade-insecure-requests`);
 * - `null` or `false`: removes the directive, including a default one.
 *
 * @publicApi
 */
export type ContentSecurityPolicyDirectiveValue =
  string | readonly string[] | boolean | null;

/**
 * @publicApi
 */
export interface ContentSecurityPolicyOptions {
  /**
   * Whether `directives` are merged into the default directives. When
   * `false`, only `directives` are sent, and they must include `default-src`
   * (or remove it explicitly with `defaultSrc: null`).
   *
   * @default true
   */
  useDefaults?: boolean;
  /**
   * Directives keyed by name, in camelCase (`scriptSrc`) or kebab-case
   * (`'script-src'`). A directive given here replaces the default directive
   * of the same name.
   */
  directives?: Record<string, ContentSecurityPolicyDirectiveValue>;
  /**
   * Sends `Content-Security-Policy-Report-Only` instead, so violations are
   * reported (see the `report-to` directive) but not blocked.
   *
   * @default false
   */
  reportOnly?: boolean;
}

/**
 * Options for `app.useSecurityHeaders()`.
 *
 * Each key controls one header and accepts `false` to leave that header out,
 * `true` for its default value (the same defaults as helmet 8), or an object
 * to configure it. Option names match helmet's, so existing helmet
 * configurations carry over, except for helmet's legacy aliases (`hsts`,
 * `frameguard`, ...). Unknown options are rejected.
 *
 * @publicApi
 */
export interface SecurityHeadersOptions {
  /**
   * `Content-Security-Policy`. Default: `default-src 'self'; base-uri 'self';
   * font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self';
   * img-src 'self' data:; object-src 'none'; script-src 'self';
   * script-src-attr 'none'; style-src 'self' https: 'unsafe-inline';
   * upgrade-insecure-requests` (serialized without spaces after `;`).
   */
  contentSecurityPolicy?: boolean | ContentSecurityPolicyOptions;
  /**
   * `Cross-Origin-Embedder-Policy`. Not sent by default; `true` sends
   * `require-corp`.
   */
  crossOriginEmbedderPolicy?:
    boolean | { policy?: 'require-corp' | 'credentialless' | 'unsafe-none' };
  /**
   * `Cross-Origin-Opener-Policy`. Default: `same-origin`.
   */
  crossOriginOpenerPolicy?:
    | boolean
    | {
        policy?:
          | 'same-origin'
          | 'same-origin-allow-popups'
          | 'noopener-allow-popups'
          | 'unsafe-none';
      };
  /**
   * `Cross-Origin-Resource-Policy`. Default: `same-origin`.
   */
  crossOriginResourcePolicy?:
    boolean | { policy?: 'same-origin' | 'same-site' | 'cross-origin' };
  /**
   * `Origin-Agent-Cluster: ?1`.
   */
  originAgentCluster?: boolean;
  /**
   * `Referrer-Policy`. Default: `no-referrer`. A list is sent as a fallback
   * chain (the browser uses the last one it supports).
   */
  referrerPolicy?:
    boolean | { policy?: ReferrerPolicyToken | readonly ReferrerPolicyToken[] };
  /**
   * `Strict-Transport-Security`. Default: `max-age=31536000;
   * includeSubDomains`. Browsers ignore it over plain HTTP.
   */
  strictTransportSecurity?:
    | boolean
    | {
        /** In seconds. @default 31536000 (365 days) */
        maxAge?: number;
        /** @default true */
        includeSubDomains?: boolean;
        /** @default false */
        preload?: boolean;
      };
  /**
   * `X-Content-Type-Options: nosniff`.
   */
  xContentTypeOptions?: boolean;
  /**
   * `X-DNS-Prefetch-Control`. Default: `off`; `{ allow: true }` sends `on`.
   */
  xDnsPrefetchControl?: boolean | { allow?: boolean };
  /**
   * `X-Download-Options: noopen`.
   */
  xDownloadOptions?: boolean;
  /**
   * `X-Frame-Options`. Default: `SAMEORIGIN`. Superseded by the CSP
   * `frame-ancestors` directive, kept for older browsers.
   */
  xFrameOptions?: boolean | { action?: 'deny' | 'sameorigin' };
  /**
   * `X-Permitted-Cross-Domain-Policies`. Default: `none`.
   */
  xPermittedCrossDomainPolicies?:
    | boolean
    | {
        permittedPolicies?: 'none' | 'master-only' | 'by-content-type' | 'all';
      };
  /**
   * Removes the `X-Powered-By` header (on Express, also disables the
   * `x-powered-by` setting). `false` leaves it untouched.
   */
  xPoweredBy?: boolean;
  /**
   * `X-XSS-Protection: 0`, which disables the legacy XSS auditor of old
   * browsers (a source of vulnerabilities itself).
   */
  xXssProtection?: boolean;
}

/**
 * @publicApi
 */
export type ReferrerPolicyToken =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'same-origin'
  | 'origin'
  | 'strict-origin'
  | 'origin-when-cross-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';
