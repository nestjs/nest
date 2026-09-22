import type {
  ContentSecurityPolicyDirectiveValue,
  ContentSecurityPolicyOptions,
  ReferrerPolicyToken,
  SecurityHeadersOptions,
} from '@nestjs/common';
import { isObject, isPlainObject, isString } from '@nestjs/common/internal';

/**
 * Security headers resolved and validated from `app.useSecurityHeaders()`
 * options, written on every response by the security request hook.
 */
export interface ResolvedSecurityHeaders {
  /** Headers to set on every response, as `[name, value]` pairs. */
  readonly headers: ReadonlyArray<readonly [name: string, value: string]>;
  /** Headers to remove from every response (e.g. `X-Powered-By`). */
  readonly removeHeaders: readonly string[];
}

/**
 * Default Content-Security-Policy directives, identical to helmet 8.
 */
export const DEFAULT_CONTENT_SECURITY_POLICY_DIRECTIVES: Readonly<
  Record<string, readonly string[]>
> = Object.freeze({
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'font-src': ["'self'", 'https:', 'data:'],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'img-src': ["'self'", 'data:'],
  'object-src': ["'none'"],
  'script-src': ["'self'"],
  'script-src-attr': ["'none'"],
  'style-src': ["'self'", 'https:', "'unsafe-inline'"],
  'upgrade-insecure-requests': [],
});

const DEFAULT_HSTS_MAX_AGE = 365 * 24 * 60 * 60;

const COEP_POLICIES = ['require-corp', 'credentialless', 'unsafe-none'];
const COOP_POLICIES = [
  'same-origin',
  'same-origin-allow-popups',
  'noopener-allow-popups',
  'unsafe-none',
];
const CORP_POLICIES = ['same-origin', 'same-site', 'cross-origin'];
const REFERRER_POLICIES: readonly ReferrerPolicyToken[] = [
  '',
  'no-referrer',
  'no-referrer-when-downgrade',
  'same-origin',
  'origin',
  'strict-origin',
  'origin-when-cross-origin',
  'strict-origin-when-cross-origin',
  'unsafe-url',
];
const X_FRAME_OPTIONS_ACTIONS = ['deny', 'sameorigin'];
const X_PERMITTED_CROSS_DOMAIN_POLICIES = [
  'none',
  'master-only',
  'by-content-type',
  'all',
];

/**
 * Option names of `SecurityHeadersOptions`, with the object keys each one
 * accepts (an empty list for boolean-only options).
 */
const OPTION_KEYS: Readonly<Record<keyof SecurityHeadersOptions, string[]>> = {
  contentSecurityPolicy: ['directives', 'reportOnly', 'useDefaults'],
  crossOriginEmbedderPolicy: ['policy'],
  crossOriginOpenerPolicy: ['policy'],
  crossOriginResourcePolicy: ['policy'],
  originAgentCluster: [],
  referrerPolicy: ['policy'],
  strictTransportSecurity: ['includeSubDomains', 'maxAge', 'preload'],
  xContentTypeOptions: [],
  xDnsPrefetchControl: ['allow'],
  xDownloadOptions: [],
  xFrameOptions: ['action'],
  xPermittedCrossDomainPolicies: ['permittedPolicies'],
  xPoweredBy: [],
  xXssProtection: [],
};

/**
 * helmet's legacy option names, which are not supported, mapped to the
 * current ones for a helpful error message.
 */
const HELMET_LEGACY_OPTION_NAMES: Readonly<Record<string, string>> = {
  dnsPrefetchControl: 'xDnsPrefetchControl',
  frameguard: 'xFrameOptions',
  hidePoweredBy: 'xPoweredBy',
  hsts: 'strictTransportSecurity',
  ieNoOpen: 'xDownloadOptions',
  noSniff: 'xContentTypeOptions',
  permittedCrossDomainPolicies: 'xPermittedCrossDomainPolicies',
  xssFilter: 'xXssProtection',
};

/**
 * Source expressions that are only valid quoted. Unquoted, the browser reads
 * them as host names, which silently weakens or breaks the policy.
 */
const MUST_BE_QUOTED =
  /^(?:self|none|strict-dynamic|report-sample|inline-speculation-rules|unsafe-inline|unsafe-eval|unsafe-hashes|wasm-unsafe-eval|unsafe-allow-redirects)$|^(?:nonce|sha256|sha384|sha512)-[A-Za-z0-9+/_=-]+$/i;
// Separators of the header grammar (`;` between directives, `,` between
// policies) must never appear in a source expression, nor may control
// characters (header injection) or non-ASCII characters (which Node.js
// rejects when the header is written, i.e. at request time).
const FORBIDDEN_VALUE_CHARACTERS = /[;,]|[^\x20-\x7e]/;
const DIRECTIVE_NAME = /^[a-zA-Z0-9-]+$/;
const NORMALIZED_DIRECTIVE_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export class SecurityHeadersConfigurationError extends Error {
  constructor(message: string) {
    super(`Invalid security headers configuration: ${message}`);
    this.name = 'SecurityHeadersConfigurationError';
  }
}

const fail = (message: string): never => {
  throw new SecurityHeadersConfigurationError(message);
};

/**
 * Serializes a Content-Security-Policy, validating directive names and
 * values so that user input cannot inject extra directives or policies.
 * Directive names may be camelCase (`scriptSrc`) or kebab-case.
 *
 * @returns the header value (directives separated by `;`, like helmet).
 */
export function serializeContentSecurityPolicy(
  options: ContentSecurityPolicyOptions = {},
): string {
  const { useDefaults = true, directives = {} } = options;
  if (typeof useDefaults !== 'boolean') {
    fail('contentSecurityPolicy.useDefaults must be a boolean.');
  }
  if (!isObject(directives) || Array.isArray(directives)) {
    fail('contentSecurityPolicy.directives must be an object.');
  }

  const result = new Map<string, readonly string[]>();
  if (useDefaults) {
    for (const [name, value] of Object.entries(
      DEFAULT_CONTENT_SECURITY_POLICY_DIRECTIVES,
    )) {
      result.set(name, value);
    }
  }

  const seen = new Set<string>();
  const removed = new Set<string>();
  for (const [rawName, rawValue] of Object.entries(directives)) {
    const name = normalizeDirectiveName(rawName);
    if (seen.has(name)) {
      fail(`Content-Security-Policy directive "${name}" is set twice.`);
    }
    seen.add(name);

    const values = normalizeDirectiveValue(name, rawValue);
    if (values === null) {
      removed.add(name);
      result.delete(name);
    } else {
      result.set(name, values);
    }
  }

  if (!result.has('default-src') && !removed.has('default-src')) {
    fail(
      'Content-Security-Policy needs a "default-src" directive. Set ' +
        '"defaultSrc: null" to omit it deliberately.',
    );
  }
  if (result.size === 0) {
    fail('Content-Security-Policy has no directives.');
  }

  return Array.from(result, ([name, values]) =>
    values.length > 0 ? `${name} ${values.join(' ')}` : name,
  ).join(';');
}

function normalizeDirectiveName(rawName: string): string {
  const name = DIRECTIVE_NAME.test(rawName)
    ? rawName.replace(/[A-Z]/g, letter => `-${letter}`).toLowerCase()
    : '';
  if (!NORMALIZED_DIRECTIVE_NAME.test(name)) {
    fail(
      `"${rawName}" is not a valid Content-Security-Policy directive name ` +
        '(expected camelCase, e.g. "scriptSrc", or lower-case kebab-case, ' +
        'e.g. "script-src").',
    );
  }
  return name;
}

function normalizeDirectiveValue(
  name: string,
  value: ContentSecurityPolicyDirectiveValue | undefined,
): readonly string[] | null {
  if (value === null || value === false || value === undefined) {
    return null;
  }
  if (value === true) {
    return [];
  }
  const values = isString(value) ? [value] : value;
  if (!Array.isArray(values)) {
    return fail(
      `Content-Security-Policy directive "${name}" must be a string, a ` +
        'list of strings, a boolean or null.',
    );
  }
  return values.map(item => {
    if (!isString(item) || item.trim().length === 0) {
      return fail(
        `Content-Security-Policy directive "${name}" contains an empty or ` +
          'non-string value.',
      );
    }
    if (FORBIDDEN_VALUE_CHARACTERS.test(item)) {
      return fail(
        `Content-Security-Policy directive "${name}" contains an invalid ` +
          `value ${JSON.stringify(item)}: ";", "," and control or non-ASCII ` +
          'characters are not allowed.',
      );
    }
    if (item.split(/\s+/).some(token => MUST_BE_QUOTED.test(token))) {
      return fail(
        `Content-Security-Policy directive "${name}" contains ` +
          `${JSON.stringify(item)}: keywords, nonces and hashes must be ` +
          `single-quoted (e.g. "'self'").`,
      );
    }
    return item.trim();
  });
}

/**
 * Resolves `app.useSecurityHeaders()` options into the headers to set and
 * remove on every response, validating them once, at startup: unknown
 * options, values of the wrong type and invalid policies are rejected.
 *
 * Without options, the result matches helmet 8's defaults.
 */
export function resolveSecurityHeaders(
  options: SecurityHeadersOptions = {},
): ResolvedSecurityHeaders {
  if (!isPlainObject(options)) {
    fail('expected an options object.');
  }
  for (const name of Object.keys(options)) {
    if (!Object.hasOwn(OPTION_KEYS, name)) {
      const current = HELMET_LEGACY_OPTION_NAMES[name];
      fail(
        `unknown option "${name}"` +
          (current ? ` (helmet's legacy name, use "${current}").` : '.'),
      );
    }
  }

  const headers: Array<readonly [string, string]> = [];
  const add = (name: string, value: string) => headers.push([name, value]);

  const csp = readOption(options, 'contentSecurityPolicy', true);
  if (csp) {
    add(
      readBoolean(csp, 'contentSecurityPolicy', 'reportOnly', false)
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy',
      serializeContentSecurityPolicy(csp),
    );
  }

  const coep = readOption(options, 'crossOriginEmbedderPolicy', false);
  if (coep) {
    add(
      'Cross-Origin-Embedder-Policy',
      pick(
        'crossOriginEmbedderPolicy.policy',
        coep.policy,
        COEP_POLICIES,
        'require-corp',
      ),
    );
  }

  const coop = readOption(options, 'crossOriginOpenerPolicy', true);
  if (coop) {
    add(
      'Cross-Origin-Opener-Policy',
      pick(
        'crossOriginOpenerPolicy.policy',
        coop.policy,
        COOP_POLICIES,
        'same-origin',
      ),
    );
  }

  const corp = readOption(options, 'crossOriginResourcePolicy', true);
  if (corp) {
    add(
      'Cross-Origin-Resource-Policy',
      pick(
        'crossOriginResourcePolicy.policy',
        corp.policy,
        CORP_POLICIES,
        'same-origin',
      ),
    );
  }

  if (readOption(options, 'originAgentCluster', true)) {
    add('Origin-Agent-Cluster', '?1');
  }

  const referrer = readOption(options, 'referrerPolicy', true);
  if (referrer) {
    add('Referrer-Policy', resolveReferrerPolicy(referrer.policy));
  }

  const hsts = readOption(options, 'strictTransportSecurity', true);
  if (hsts) {
    add('Strict-Transport-Security', resolveHsts(hsts));
  }

  if (readOption(options, 'xContentTypeOptions', true)) {
    add('X-Content-Type-Options', 'nosniff');
  }

  const dnsPrefetch = readOption(options, 'xDnsPrefetchControl', true);
  if (dnsPrefetch) {
    const allow = readBoolean(dnsPrefetch, 'xDnsPrefetchControl', 'allow');
    add('X-DNS-Prefetch-Control', allow ? 'on' : 'off');
  }

  if (readOption(options, 'xDownloadOptions', true)) {
    add('X-Download-Options', 'noopen');
  }

  const frameOptions = readOption(options, 'xFrameOptions', true);
  if (frameOptions) {
    const { action } = frameOptions;
    add(
      'X-Frame-Options',
      pick(
        'xFrameOptions.action',
        isString(action) ? action.toLowerCase() : action,
        X_FRAME_OPTIONS_ACTIONS,
        'sameorigin',
      ).toUpperCase(),
    );
  }

  const crossDomain = readOption(
    options,
    'xPermittedCrossDomainPolicies',
    true,
  );
  if (crossDomain) {
    add(
      'X-Permitted-Cross-Domain-Policies',
      pick(
        'xPermittedCrossDomainPolicies.permittedPolicies',
        crossDomain.permittedPolicies,
        X_PERMITTED_CROSS_DOMAIN_POLICIES,
        'none',
      ),
    );
  }

  if (readOption(options, 'xXssProtection', true)) {
    add('X-XSS-Protection', '0');
  }

  const removeHeaders = readOption(options, 'xPoweredBy', true)
    ? ['X-Powered-By']
    : [];
  return { headers, removeHeaders };
}

type OptionObject<K extends keyof SecurityHeadersOptions> = Extract<
  NonNullable<SecurityHeadersOptions[K]>,
  object
>;

/**
 * Reads one header option: `undefined` when the header is left out, and its
 * options object (`{}` for `true` and for an enabled default) otherwise.
 */
function readOption<K extends keyof SecurityHeadersOptions>(
  options: SecurityHeadersOptions,
  name: K,
  enabledByDefault: boolean,
): Partial<OptionObject<K>> | undefined {
  const value: unknown = options[name];
  if (value === undefined) {
    return enabledByDefault ? {} : undefined;
  }
  if (typeof value === 'boolean') {
    return value ? {} : undefined;
  }
  const keys = OPTION_KEYS[name];
  if (keys.length === 0 || !isPlainObject(value)) {
    return fail(
      `${name} must be a boolean${keys.length > 0 ? ' or an object' : ''}, ` +
        `received ${JSON.stringify(value)}.`,
    );
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      fail(
        `unknown option "${name}.${key}" (expected ` +
          `${keys.map(k => `"${k}"`).join(', ')}).`,
      );
    }
  }
  return value as Partial<OptionObject<K>>;
}

function readBoolean(
  object: object,
  option: string,
  key: string,
  fallback = false,
): boolean {
  const value: unknown = (object as Record<string, unknown>)[key];
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'boolean') {
    fail(
      `${option}.${key} must be a boolean, received ${JSON.stringify(value)}.`,
    );
  }
  return value as boolean;
}

function pick(
  option: string,
  value: unknown,
  allowed: readonly string[],
  fallback: string,
): string {
  if (value === undefined) {
    return fallback;
  }
  if (!isString(value) || !allowed.includes(value)) {
    fail(
      `${option} must be one of ${allowed.map(v => `"${v}"`).join(', ')}, ` +
        `received ${JSON.stringify(value)}.`,
    );
  }
  return value as string;
}

function resolveReferrerPolicy(
  policy: ReferrerPolicyToken | readonly ReferrerPolicyToken[] | undefined,
): string {
  if (policy === undefined) {
    return 'no-referrer';
  }
  const tokens: readonly unknown[] = isString(policy) ? [policy] : policy;
  if (!Array.isArray(tokens) || tokens.length === 0) {
    fail('referrerPolicy.policy must be a token or a non-empty list.');
  }
  const unique = new Set<unknown>();
  for (const token of tokens) {
    pick('referrerPolicy.policy', token, REFERRER_POLICIES, 'no-referrer');
    if (unique.has(token)) {
      fail(`referrerPolicy.policy contains "${token}" more than once.`);
    }
    unique.add(token);
  }
  return tokens.join(',');
}

function resolveHsts(option: {
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}): string {
  const maxAge = option.maxAge ?? DEFAULT_HSTS_MAX_AGE;
  if (typeof maxAge !== 'number' || !Number.isFinite(maxAge) || maxAge < 0) {
    fail(
      'strictTransportSecurity.maxAge must be a non-negative number of ' +
        `seconds, received ${JSON.stringify(maxAge)}.`,
    );
  }
  let value = `max-age=${Math.floor(maxAge)}`;
  if (
    readBoolean(option, 'strictTransportSecurity', 'includeSubDomains', true)
  ) {
    value += '; includeSubDomains';
  }
  if (readBoolean(option, 'strictTransportSecurity', 'preload')) {
    value += '; preload';
  }
  return value;
}
