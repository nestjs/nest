import {
  SecurityHeadersConfigurationError,
  resolveSecurityHeaders,
  serializeContentSecurityPolicy,
} from '../../security/security-headers.js';

const HELMET_DEFAULT_CSP =
  "default-src 'self';base-uri 'self';font-src 'self' https: data:;" +
  "form-action 'self';frame-ancestors 'self';img-src 'self' data:;" +
  "object-src 'none';script-src 'self';script-src-attr 'none';" +
  "style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests";

describe('serializeContentSecurityPolicy', () => {
  it('serializes the helmet 8 default policy', () => {
    expect(serializeContentSecurityPolicy()).toBe(HELMET_DEFAULT_CSP);
  });

  it('replaces default directives in place and appends new ones', () => {
    expect(
      serializeContentSecurityPolicy({
        directives: {
          scriptSrc: ["'self'", 'https://cdn.example'],
          'connect-src': "'self' wss://app.example",
          reportTo: 'csp-endpoint',
        },
      }),
    ).toBe(
      HELMET_DEFAULT_CSP.replace(
        "script-src 'self';",
        "script-src 'self' https://cdn.example;",
      ) + ";connect-src 'self' wss://app.example;report-to csp-endpoint",
    );
  });

  it('removes directives set to null or false', () => {
    const policy = serializeContentSecurityPolicy({
      directives: { upgradeInsecureRequests: null, 'form-action': false },
    });
    expect(policy).not.toContain('upgrade-insecure-requests');
    expect(policy).not.toContain('form-action');
    expect(policy.startsWith("default-src 'self';")).toBe(true);
  });

  it('serializes valueless directives from true and empty lists', () => {
    expect(
      serializeContentSecurityPolicy({
        useDefaults: false,
        directives: {
          defaultSrc: "'none'",
          upgradeInsecureRequests: true,
          blockAllMixedContent: [],
        },
      }),
    ).toBe(
      "default-src 'none';upgrade-insecure-requests;block-all-mixed-content",
    );
  });

  it('only sends the given directives when useDefaults is false', () => {
    expect(
      serializeContentSecurityPolicy({
        useDefaults: false,
        directives: { defaultSrc: ["'self'"], imgSrc: ['*'] },
      }),
    ).toBe("default-src 'self';img-src *");
  });

  it('requires default-src unless it is removed explicitly', () => {
    expect(() =>
      serializeContentSecurityPolicy({
        useDefaults: false,
        directives: { scriptSrc: "'self'" },
      }),
    ).toThrow(/needs a "default-src"/);
    expect(
      serializeContentSecurityPolicy({
        directives: { defaultSrc: null },
      }),
    ).not.toContain('default-src');
  });

  describe('rejects injection attempts and invalid input', () => {
    it.each([
      ['a ";" in a value', { scriptSrc: ["'self'; script-src *"] }, /";", ","/],
      ['a "," in a value', { scriptSrc: "'self', script-src *" }, /";", ","/],
      ['a CR/LF in a value', { scriptSrc: "'self'\r\nX-Evil: 1" }, /control/],
      ['a tab in a value', { scriptSrc: "'self'\thttps:" }, /control/],
      ['a non-ASCII value', { imgSrc: 'https://bücher.example' }, /non-ASCII/],
      ['an empty value', { scriptSrc: [''] }, /empty/],
      ['a non-string value', { scriptSrc: [42 as any] }, /non-string/],
      ['an object value', { scriptSrc: {} as any }, /must be a string/],
      ['a ";" in a name', { 'script-src;img-src': "'self'" }, /name/],
      ['a space in a name', { 'script src': "'self'" }, /name/],
      ['an empty name', { '': "'self'" }, /name/],
      ['an upper-case name', { 'SCRIPT-SRC': "'self'" }, /name/],
      ['a name with a double dash', { 'script--src': "'self'" }, /name/],
      ['an unquoted keyword', { scriptSrc: 'self' }, /single-quoted/],
      [
        'an unquoted keyword among others',
        { scriptSrc: 'https: unsafe-inline' },
        /single-quoted/,
      ],
      ['an unquoted nonce', { scriptSrc: 'nonce-abc123' }, /single-quoted/],
      [
        'the same directive twice',
        { scriptSrc: "'self'", 'script-src': "'none'" },
        /set twice/,
      ],
    ])('%s', (_title, directives, message) => {
      expect(() => serializeContentSecurityPolicy({ directives })).toThrow(
        SecurityHeadersConfigurationError,
      );
      expect(() => serializeContentSecurityPolicy({ directives })).toThrow(
        message,
      );
    });

    it('accepts quoted keywords, nonces, hashes and host names', () => {
      expect(
        serializeContentSecurityPolicy({
          useDefaults: false,
          directives: {
            defaultSrc: "'self'",
            scriptSrc: [
              "'strict-dynamic'",
              "'nonce-abc123'",
              "'sha256-AbC+/=='",
              'self.example.com',
              'https://sha256-cdn.example',
            ],
          },
        }),
      ).toBe(
        "default-src 'self';script-src 'strict-dynamic' 'nonce-abc123' " +
          "'sha256-AbC+/==' self.example.com https://sha256-cdn.example",
      );
    });
  });
});

describe('resolveSecurityHeaders', () => {
  it('returns the helmet 8 defaults', () => {
    expect(resolveSecurityHeaders()).toEqual({
      headers: [
        ['Content-Security-Policy', HELMET_DEFAULT_CSP],
        ['Cross-Origin-Opener-Policy', 'same-origin'],
        ['Cross-Origin-Resource-Policy', 'same-origin'],
        ['Origin-Agent-Cluster', '?1'],
        ['Referrer-Policy', 'no-referrer'],
        ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
        ['X-Content-Type-Options', 'nosniff'],
        ['X-DNS-Prefetch-Control', 'off'],
        ['X-Download-Options', 'noopen'],
        ['X-Frame-Options', 'SAMEORIGIN'],
        ['X-Permitted-Cross-Domain-Policies', 'none'],
        ['X-XSS-Protection', '0'],
      ],
      removeHeaders: ['X-Powered-By'],
    });
  });

  it('treats true like the defaults', () => {
    expect(
      resolveSecurityHeaders({
        contentSecurityPolicy: true,
        strictTransportSecurity: true,
        xFrameOptions: true,
        referrerPolicy: true,
      }),
    ).toEqual(resolveSecurityHeaders());
  });

  it('leaves out headers set to false', () => {
    const { headers, removeHeaders } = resolveSecurityHeaders({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      originAgentCluster: false,
      referrerPolicy: false,
      strictTransportSecurity: false,
      xContentTypeOptions: false,
      xDnsPrefetchControl: false,
      xDownloadOptions: false,
      xFrameOptions: false,
      xPermittedCrossDomainPolicies: false,
      xPoweredBy: false,
      xXssProtection: false,
    });
    expect(headers).toEqual([]);
    expect(removeHeaders).toEqual([]);
  });

  it('configures each header', () => {
    const { headers } = resolveSecurityHeaders({
      contentSecurityPolicy: {
        reportOnly: true,
        useDefaults: false,
        directives: { defaultSrc: "'self'" },
      },
      crossOriginEmbedderPolicy: { policy: 'credentialless' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: {
        policy: ['no-referrer', 'strict-origin-when-cross-origin'],
      },
      strictTransportSecurity: {
        maxAge: 63072000.9,
        includeSubDomains: false,
        preload: true,
      },
      xDnsPrefetchControl: { allow: true },
      xFrameOptions: { action: 'deny' },
      xPermittedCrossDomainPolicies: { permittedPolicies: 'by-content-type' },
    });
    expect(Object.fromEntries(headers)).toEqual({
      'Content-Security-Policy-Report-Only': "default-src 'self'",
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Origin-Agent-Cluster': '?1',
      'Referrer-Policy': 'no-referrer,strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=63072000; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-DNS-Prefetch-Control': 'on',
      'X-Download-Options': 'noopen',
      'X-Frame-Options': 'DENY',
      'X-Permitted-Cross-Domain-Policies': 'by-content-type',
      'X-XSS-Protection': '0',
    });
  });

  it('sends Cross-Origin-Embedder-Policy: require-corp for true', () => {
    const { headers } = resolveSecurityHeaders({
      crossOriginEmbedderPolicy: true,
    });
    expect(headers).toContainEqual([
      'Cross-Origin-Embedder-Policy',
      'require-corp',
    ]);
  });

  it.each([
    [{ crossOriginOpenerPolicy: { policy: 'same-site' as any } }],
    [{ crossOriginResourcePolicy: { policy: 'none' as any } }],
    [{ crossOriginEmbedderPolicy: { policy: 'corp' as any } }],
    [{ referrerPolicy: { policy: 'never' as any } }],
    [{ referrerPolicy: { policy: [] } }],
    [{ referrerPolicy: { policy: ['origin', 'origin'] as any } }],
    [{ strictTransportSecurity: { maxAge: -1 } }],
    [{ strictTransportSecurity: { maxAge: Infinity } }],
    [{ strictTransportSecurity: { maxAge: '1' as any } }],
    [{ xFrameOptions: { action: 'allow-from' as any } }],
    [{ xPermittedCrossDomainPolicies: { permittedPolicies: 'x' as any } }],
    [{ xFrameOptions: { action: 1 as any } }],
    [{ strictTransportSecurity: { includeSubDomains: 'no' as any } }],
    [{ strictTransportSecurity: 'yes' as any }],
    [{ contentSecurityPolicy: { reportOnly: 1 as any } }],
    [{ contentSecurityPolicy: { useDefaults: 'false' as any } }],
    [{ contentSecurityPolicy: { directives: null as any } }],
    [{ crossOriginOpenerPolicy: 'same-origin-allow-popups' as any }],
    [{ xContentTypeOptions: {} as any }],
    [{ xDnsPrefetchControl: { allow: 'on' as any } }],
    [null as any],
    [[] as any],
  ])('rejects invalid options %j', options => {
    expect(() => resolveSecurityHeaders(options)).toThrow(
      SecurityHeadersConfigurationError,
    );
  });

  it('rejects unknown options, pointing to the name of a legacy helmet option', () => {
    expect(() => resolveSecurityHeaders({ hsts: false } as any)).toThrow(
      'unknown option "hsts" (helmet\'s legacy name, use "strictTransportSecurity").',
    );
    expect(() =>
      resolveSecurityHeaders({ contentSecurityPolicies: false } as any),
    ).toThrow('unknown option "contentSecurityPolicies".');
    expect(() =>
      resolveSecurityHeaders({
        contentSecurityPolicy: { directive: { scriptSrc: "'none'" } } as any,
      }),
    ).toThrow('unknown option "contentSecurityPolicy.directive"');
  });
});
