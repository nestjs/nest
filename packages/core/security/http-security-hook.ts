import type { ApplicationConfig } from '../application-config.js';
import { RouteInfoPathExtractor } from '../middleware/route-info-path-extractor.js';
import type { CrossOriginProtection } from './cross-origin-protection.js';

/**
 * The one request hook behind the built-in HTTP security features
 * (`app.enableCsrfProtection()`), installed through
 * `HttpServer.registerSecurityHook()` the first time one of them is enabled.
 */
export class HttpSecurityHook<TRequest = any> {
  private crossOriginProtection?: CrossOriginProtection<TRequest>;

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
  public handle(request: TRequest): Error | undefined {
    return this.crossOriginProtection?.check(request);
  }
}
