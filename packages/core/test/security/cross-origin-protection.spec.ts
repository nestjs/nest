import {
  ForbiddenException,
  RequestMethod,
  VersioningType,
} from '@nestjs/common';
import { ApplicationConfig } from '../../application-config.js';
import { RouteInfoPathExtractor } from '../../middleware/route-info-path-extractor.js';
import { mapToExcludeRoute } from '../../middleware/utils.js';
import {
  type CrossOriginDecision,
  type CrossOriginRequestInfo,
  CrossOriginProtection,
  evaluateCrossOriginRequest,
  normalizeTrustedOrigin,
} from '../../security/cross-origin-protection.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

describe('evaluateCrossOriginRequest', () => {
  const trusted = new Set(['https://trusted.example']);

  type Row = [
    title: string,
    request: CrossOriginRequestInfo,
    expected: CrossOriginDecision,
  ];

  const rows: Row[] = [
    // Safe methods are always allowed, whatever the headers say.
    ...['GET', 'HEAD', 'OPTIONS'].map((method): Row => [
      `${method} cross-site`,
      {
        method,
        secFetchSite: 'cross-site',
        origin: 'https://evil.example',
        host: 'app.example',
      },
      { allowed: true, reason: 'safe-method' },
    ]),
    [
      'methods are case-sensitive ("get" is not GET)',
      {
        method: 'get',
        secFetchSite: 'cross-site',
        origin: 'https://evil.example',
        host: 'app.example',
      },
      { allowed: false, reason: 'cross-origin-sec-fetch-site' },
    ],
    // Sec-Fetch-Site present.
    [
      'POST same-origin',
      { method: 'POST', secFetchSite: 'same-origin', host: 'app.example' },
      { allowed: true, reason: 'same-origin' },
    ],
    [
      'POST none (user-initiated)',
      { method: 'POST', secFetchSite: 'none', host: 'app.example' },
      { allowed: true, reason: 'same-origin' },
    ],
    [
      'POST same-origin ignores a mismatching Origin',
      {
        method: 'POST',
        secFetchSite: 'same-origin',
        origin: 'https://evil.example',
        host: 'app.example',
      },
      { allowed: true, reason: 'same-origin' },
    ],
    [
      'POST cross-site',
      {
        method: 'POST',
        secFetchSite: 'cross-site',
        origin: 'https://evil.example',
        host: 'app.example',
      },
      { allowed: false, reason: 'cross-origin-sec-fetch-site' },
    ],
    [
      'PUT same-site (sibling subdomain) is cross-origin',
      {
        method: 'PUT',
        secFetchSite: 'same-site',
        origin: 'https://sub.app.example',
        host: 'app.example',
      },
      { allowed: false, reason: 'cross-origin-sec-fetch-site' },
    ],
    [
      'DELETE with an unknown Sec-Fetch-Site value',
      { method: 'DELETE', secFetchSite: 'bogus', host: 'app.example' },
      { allowed: false, reason: 'cross-origin-sec-fetch-site' },
    ],
    [
      'POST with duplicated Sec-Fetch-Site values',
      {
        method: 'POST',
        secFetchSite: 'same-origin, cross-site',
        host: 'app.example',
      },
      { allowed: false, reason: 'cross-origin-sec-fetch-site' },
    ],
    [
      'Sec-Fetch-Site cross-site with Origin matching Host is still rejected',
      {
        method: 'POST',
        secFetchSite: 'cross-site',
        origin: 'https://app.example',
        host: 'app.example',
      },
      { allowed: false, reason: 'cross-origin-sec-fetch-site' },
    ],
    [
      'cross-site from a trusted origin',
      {
        method: 'POST',
        secFetchSite: 'cross-site',
        origin: 'https://trusted.example',
        host: 'app.example',
      },
      { allowed: true, reason: 'trusted-origin' },
    ],
    [
      'cross-site: trusted origins match exactly (scheme)',
      {
        method: 'POST',
        secFetchSite: 'cross-site',
        origin: 'http://trusted.example',
        host: 'app.example',
      },
      { allowed: false, reason: 'cross-origin-sec-fetch-site' },
    ],
    // Sec-Fetch-Site absent: Origin/Host fallback.
    [
      'POST without Sec-Fetch-Site and without Origin (non-browser)',
      { method: 'POST', host: 'app.example' },
      { allowed: true, reason: 'no-browser-headers' },
    ],
    [
      'empty headers count as absent',
      { method: 'POST', secFetchSite: '', origin: '', host: 'app.example' },
      { allowed: true, reason: 'no-browser-headers' },
    ],
    [
      'Origin host matches Host',
      { method: 'POST', origin: 'https://app.example', host: 'app.example' },
      { allowed: true, reason: 'origin-matches-host' },
    ],
    [
      'Origin host matches Host including the port',
      {
        method: 'PATCH',
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
      },
      { allowed: true, reason: 'origin-matches-host' },
    ],
    [
      'Origin host matches Host case-insensitively',
      { method: 'POST', origin: 'https://app.example', host: 'APP.example' },
      { allowed: true, reason: 'origin-matches-host' },
    ],
    [
      'Origin host matches Host with the default port of its scheme',
      {
        method: 'POST',
        origin: 'https://app.example',
        host: 'app.example:443',
      },
      { allowed: true, reason: 'origin-matches-host' },
    ],
    [
      'Origin host matches Host with the default HTTP port',
      { method: 'POST', origin: 'http://app.example', host: 'app.example:80' },
      { allowed: true, reason: 'origin-matches-host' },
    ],
    [
      'Origin host does not match Host with the default port of another scheme',
      { method: 'POST', origin: 'http://app.example', host: 'app.example:443' },
      { allowed: false, reason: 'cross-origin-origin-header' },
    ],
    [
      'Origin with an explicit port does not match Host without it',
      {
        method: 'POST',
        origin: 'https://app.example:8443',
        host: 'app.example',
      },
      { allowed: false, reason: 'cross-origin-origin-header' },
    ],
    [
      'IPv6 Origin host matches Host',
      { method: 'POST', origin: 'http://[::1]:3000', host: '[::1]:3000' },
      { allowed: true, reason: 'origin-matches-host' },
    ],
    [
      'IPv6 Origin host matches Host with the default port',
      { method: 'POST', origin: 'https://[::1]', host: '[::1]:443' },
      { allowed: true, reason: 'origin-matches-host' },
    ],
    [
      'Origin on another port',
      {
        method: 'POST',
        origin: 'http://localhost:4000',
        host: 'localhost:3000',
      },
      { allowed: false, reason: 'cross-origin-origin-header' },
    ],
    [
      'Origin on another host',
      { method: 'POST', origin: 'https://evil.example', host: 'app.example' },
      { allowed: false, reason: 'cross-origin-origin-header' },
    ],
    [
      'opaque Origin "null"',
      { method: 'POST', origin: 'null', host: 'app.example' },
      { allowed: false, reason: 'cross-origin-origin-header' },
    ],
    [
      'Origin without a Host header',
      { method: 'POST', origin: 'https://app.example' },
      { allowed: false, reason: 'cross-origin-origin-header' },
    ],
    [
      'Origin mismatch from a trusted origin',
      {
        method: 'POST',
        origin: 'https://trusted.example',
        host: 'app.example',
      },
      { allowed: true, reason: 'trusted-origin' },
    ],
  ];

  it.each(rows)('%s', (_title, request, expected) => {
    expect(
      evaluateCrossOriginRequest(request, { trustedOrigins: trusted }),
    ).toEqual(expected);
  });

  it('allows rejected requests that are excluded', () => {
    const isExcluded = vi.fn(() => true);
    expect(
      evaluateCrossOriginRequest(
        { method: 'POST', secFetchSite: 'cross-site', host: 'app.example' },
        { isExcluded },
      ),
    ).toEqual({ allowed: true, reason: 'excluded' });
  });

  it('only evaluates exclusions for requests that would be rejected', () => {
    const isExcluded = vi.fn(() => true);
    evaluateCrossOriginRequest(
      { method: 'POST', secFetchSite: 'same-origin' },
      { isExcluded },
    );
    evaluateCrossOriginRequest({ method: 'GET' }, { isExcluded });
    expect(isExcluded).not.toHaveBeenCalled();
  });
});

describe('normalizeTrustedOrigin', () => {
  it.each([
    ['https://example.com', 'https://example.com'],
    ['https://Example.COM', 'https://example.com'],
    ['https://example.com:443', 'https://example.com'],
    ['http://localhost:4200', 'http://localhost:4200'],
    ['chrome-extension://abcdef', 'chrome-extension://abcdef'],
    ['http://[::1]:3000', 'http://[::1]:3000'],
    ['https://bücher.example', 'https://xn--bcher-kva.example'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeTrustedOrigin(input)).toBe(expected);
  });

  it.each([
    '',
    '*',
    'example.com',
    'https://',
    'https://example.com/',
    'https://example.com/path',
    'https://example.com?x=1',
    'https://example.com#frag',
    'https://user:pass@example.com',
    'https://example.com/.',
    'https://example.com/%2e%2e',
    'https:\\\\example.com',
    'https://*.example.com',
    'null',
  ])('rejects %j', input => {
    expect(() => normalizeTrustedOrigin(input)).toThrow(/Invalid trusted/);
  });
});

describe('CrossOriginProtection', () => {
  class TestAdapter extends NoopHttpAdapter {
    getRequestMethod(request: any) {
      return request.method;
    }
    getRequestUrl(request: any) {
      return request.url;
    }
  }
  const adapter = new TestAdapter({});
  const crossSitePost = (url: string, method = 'POST') => ({
    method,
    url,
    headers: {
      host: 'app.example',
      origin: 'https://evil.example',
      'sec-fetch-site': 'cross-site',
    },
  });

  it('returns a ForbiddenException for cross-origin requests', () => {
    const protection = new CrossOriginProtection(adapter);
    const error = protection.check(crossSitePost('/items'));
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error!.getStatus()).toBe(403);
  });

  it('returns undefined for same-origin requests', () => {
    const protection = new CrossOriginProtection(adapter);
    expect(
      protection.check({
        method: 'POST',
        url: '/items',
        headers: { host: 'app.example', 'sec-fetch-site': 'same-origin' },
      }),
    ).toBeUndefined();
  });

  it('uses :authority when there is no Host header (HTTP/2)', () => {
    const protection = new CrossOriginProtection(adapter);
    expect(
      protection.check({
        method: 'POST',
        url: '/items',
        headers: {
          ':authority': 'app.example',
          origin: 'https://app.example',
        },
      }),
    ).toBeUndefined();
  });

  it('prefers :authority over a Host header (RFC 9113)', () => {
    const protection = new CrossOriginProtection(adapter);
    expect(
      protection.check({
        method: 'POST',
        url: '/items',
        headers: {
          ':authority': 'app.example',
          host: 'evil.example',
          origin: 'https://evil.example',
        },
      }),
    ).toBeInstanceOf(ForbiddenException);
  });

  it('honors trusted origins', () => {
    const protection = new CrossOriginProtection(adapter, {
      trustedOrigins: ['https://EVIL.example'],
    });
    expect(protection.check(crossSitePost('/items'))).toBeUndefined();
  });

  it('rejects invalid options', () => {
    expect(() => new CrossOriginProtection(adapter, null as any)).toThrow(
      /expected an options object/,
    );
    expect(
      () =>
        new CrossOriginProtection(adapter, {
          trustedOrigin: ['https://a.example'],
        } as any),
    ).toThrow(/unknown option "trustedOrigin"/);
    expect(
      () =>
        new CrossOriginProtection(adapter, {
          trustedOrigins: 'https://a.example' as any,
        }),
    ).toThrow(/expected a list of origins/);
  });

  it('throws on invalid trusted origins', () => {
    expect(
      () =>
        new CrossOriginProtection(adapter, {
          trustedOrigins: ['https://example.com/path'],
        }),
    ).toThrow(/Invalid trusted origin/);
  });

  describe('exclude', () => {
    const createProtection = (
      exclude: any,
      configure: (config: ApplicationConfig) => void = () => {},
    ) => {
      const protection = new CrossOriginProtection(adapter, { exclude });
      const config = new ApplicationConfig();
      configure(config);
      protection.resolveExclusions(new RouteInfoPathExtractor(config));
      return protection;
    };
    const isExcluded = (
      protection: CrossOriginProtection,
      url: string,
      method = 'POST',
    ) => protection.check(crossSitePost(url, method)) === undefined;

    it('matches paths and RouteInfo entries, ignoring the query string', () => {
      const protection = createProtection([
        'webhooks/*path',
        { path: 'payments/callback', method: RequestMethod.PUT },
      ]);
      expect(isExcluded(protection, '/webhooks/stripe?x=1')).toBe(true);
      expect(isExcluded(protection, '/payments/callback', 'PUT')).toBe(true);
      expect(isExcluded(protection, '/payments/callback', 'POST')).toBe(false);
      expect(isExcluded(protection, '/items')).toBe(false);
    });

    it('excludes nothing until the exclusions are resolved (app.init())', () => {
      const protection = new CrossOriginProtection(adapter, {
        exclude: ['webhooks'],
      });
      expect(isExcluded(protection, '/webhooks')).toBe(false);
    });

    it('adds the global prefix, and only matches the prefixed path', () => {
      const protection = createProtection(['webhooks'], config =>
        config.setGlobalPrefix('/api/'),
      );
      expect(isExcluded(protection, '/api/webhooks')).toBe(true);
      expect(isExcluded(protection, '/webhooks')).toBe(false);
      expect(isExcluded(protection, '/api/api/webhooks')).toBe(false);
      expect(isExcluded(protection, '/apiwebhooks')).toBe(false);
      expect(isExcluded(protection, '/api/items')).toBe(false);
    });

    it('does not add the global prefix to routes excluded from it', () => {
      const protection = createProtection(['health'], config => {
        config.setGlobalPrefix('api');
        config.setGlobalPrefixOptions({
          exclude: mapToExcludeRoute(['health']),
        });
      });
      expect(isExcluded(protection, '/health')).toBe(true);
      expect(isExcluded(protection, '/api/health')).toBe(false);
    });

    it('adds the version segment of RouteInfo.version (URI versioning)', () => {
      const protection = createProtection(
        [{ path: 'webhooks', method: RequestMethod.POST, version: '1' }],
        config => {
          config.setGlobalPrefix('api');
          config.enableVersioning({ type: VersioningType.URI });
        },
      );
      expect(isExcluded(protection, '/api/v1/webhooks')).toBe(true);
      expect(isExcluded(protection, '/api/webhooks')).toBe(false);
      expect(isExcluded(protection, '/api/v2/webhooks')).toBe(false);
    });

    it('keeps wildcard-only exclusions unprefixed, like MiddlewareConsumer', () => {
      const protection = createProtection(
        [{ path: '*path', method: RequestMethod.PATCH }],
        config => config.setGlobalPrefix('api'),
      );
      expect(isExcluded(protection, '/anything', 'PATCH')).toBe(true);
      expect(isExcluded(protection, '/anything', 'POST')).toBe(false);
    });

    it('matches case-sensitively and without a trailing slash', () => {
      const protection = createProtection(['webhooks', 'hooks/*path']);
      expect(isExcluded(protection, '/webhooks')).toBe(true);
      expect(isExcluded(protection, '/WEBHOOKS')).toBe(false);
      expect(isExcluded(protection, '/Webhooks')).toBe(false);
      expect(isExcluded(protection, '/webhooks/')).toBe(false);
      expect(isExcluded(protection, '/webhooks/x')).toBe(false);
      expect(isExcluded(protection, '/hooks/a/b')).toBe(true);
      expect(isExcluded(protection, '/HOOKS/a')).toBe(false);
    });

    it.each([
      '/web%68ooks',
      '//webhooks',
      '/webhooks;x',
      '/webhooks#x',
      '/hooks/a/../../items',
      '/hooks/./a',
      '/hooks/a/..',
      '/hooks/%2e%2e/items',
      '/hooks/.%2E/items',
      '/hooks/a%2F..%2F..%2Fitems',
      '/hooks/a%5c..%5citems',
      '/hooks/a\\..\\items',
      '/hooks//a',
      'http://app.example/webhooks',
      '',
    ])('never excludes the non-canonical path %j', url => {
      const protection = createProtection(['webhooks', 'hooks/*path']);
      expect(isExcluded(protection, url)).toBe(false);
    });

    it('rejects invalid exclusions when constructed', () => {
      expect(
        () => new CrossOriginProtection(adapter, { exclude: ['/a/:'] }),
      ).toThrow(TypeError);
      expect(
        () =>
          new CrossOriginProtection(adapter, {
            exclude: [{ path: 'a', method: 'POST' as any }],
          }),
      ).toThrow(/Invalid CSRF protection exclusion/);
      expect(
        () => new CrossOriginProtection(adapter, { exclude: 'a' as any }),
      ).toThrow(/expected a list of routes or a function/);
    });

    it('accepts a predicate', () => {
      const protection = new CrossOriginProtection(adapter, {
        exclude: (request: any) => request.url.startsWith('/public/'),
      });
      expect(isExcluded(protection, '/public/form')).toBe(true);
      expect(isExcluded(protection, '/private')).toBe(false);
    });
  });
});
