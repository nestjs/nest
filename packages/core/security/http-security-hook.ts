import type { SecurityRequestHook } from '@nestjs/common/internal';
import type { ApplicationConfig } from '../application-config.js';
import { RouteInfoPathExtractor } from '../middleware/route-info-path-extractor.js';
import type { CrossOriginProtection } from './cross-origin-protection.js';
import type { ResolvedSecurityHeaders } from './security-headers.js';

/**
 * The one request hook behind `app.useSecurityHeaders()` and
 * `app.enableCsrfProtection()`, installed through
 * `HttpServer.registerSecurityHook()` the first time either feature is
 * enabled.
 *
 * Composing both features here fixes their order, whichever method is called
 * first: the headers are written before the CSRF check may reject the
 * request, so a `403` carries them too.
 */
export class HttpSecurityHook<TRequest = any> {
  private headers?: ResolvedSecurityHeaders;
  private crossOriginProtection?: CrossOriginProtection<TRequest>;

  public setHeaders(headers: ResolvedSecurityHeaders): void {
    this.headers = headers;
  }

  public setCrossOriginProtection(
    protection: CrossOriginProtection<TRequest>,
  ): void {
    this.crossOriginProtection = protection;
  }

  /**
   * Called by `app.init()`, once the global prefix and versioning are final.
   */
  public init(config: ApplicationConfig): void {
    this.crossOriginProtection?.resolveExclusions(
      new RouteInfoPathExtractor(config),
    );
  }

  /**
   * Runs the enabled features for one request. Returns the error to hand to
   * the exception layer when the request must be rejected.
   */
  public handle(
    request: TRequest,
    response: Parameters<SecurityRequestHook>[1],
  ): Error | undefined {
    if (this.headers) {
      for (const [name, value] of this.headers.headers) {
        response.setHeader(name, value);
      }
      for (const name of this.headers.removeHeaders) {
        response.removeHeader(name);
      }
    }
    return this.crossOriginProtection?.check(request);
  }
}
