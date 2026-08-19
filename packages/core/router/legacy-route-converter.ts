import { Logger } from '@nestjs/common';

const UNSUPPORTED_PATH_MESSAGE = (text: TemplateStringsArray, route: string) =>
  `Unsupported route path: "${route}". In previous versions, the symbols ?, *, and + were used to denote optional or repeating path parameters. The latest version of "path-to-regexp" now requires the use of named parameters. For example, instead of using a route like /users/* to capture all routes starting with "/users", you should use /users/*path. For more details, refer to the migration guide.`;

export class LegacyRouteConverter {
  private static readonly logger = new Logger(LegacyRouteConverter.name);

  /**
   * Convert legacy routes to the new format (syntax).
   * path-to-regexp used by Express>=v5 and @fastify/middie>=v9 no longer support unnamed wildcards.
   * This method attempts to convert the old syntax to the new one, and logs an error if it fails.
   * @param route The route to convert.
   * @param options Options object.
   * @returns The converted route, or the original route if it cannot be converted.
   */
  static tryConvert(
    route: string,
    options?: {
      logs?: boolean;
    },
  ): string {
    // Normalize path to eliminate additional if statements.
    const routeWithLeadingSlash = route.startsWith('/') ? route : `/${route}`;
    const normalizedRoute = route.endsWith('/')
      ? routeWithLeadingSlash
      : `${routeWithLeadingSlash}/`;

    const loggingEnabled = options?.logs ?? true;
    const printWarning = loggingEnabled
      ? this.printWarning.bind(this)
      : () => {};

    // A route may carry more than one legacy wildcard, so walk its segments and
    // convert every one of them. Converting a single occurrence left the others
    // untouched, and path-to-regexp still rejects a route that holds one.
    const segments = route.split('/');
    const lastSegmentIndex =
      segments[segments.length - 1] === ''
        ? segments.length - 2
        : segments.length - 1;

    let converted = false;
    let segmentStart = 0;
    const convertedSegments = segments.map((segment, index) => {
      // Offset of the "/" that opens this segment. Mid-path wildcards were
      // already named after it, so reuse it and leave the parameter names of
      // the routes that used to convert untouched.
      const slashOffset = Math.max(segmentStart - 1, 0);
      segmentStart += segment.length + 1;

      if (segment !== '*' && segment !== '(.*)' && segment !== '+') {
        return segment;
      }
      converted = true;

      if (index !== lastSegmentIndex) {
        // A wildcard in the middle matches at least one segment, and each one
        // needs a name of its own so that two of them never collide.
        return `*path${slashOffset}`;
      }
      // A trailing "*" or "(.*)" also matches the path without it, which the
      // optional form "{*path}" preserves. A trailing "+" does not.
      return segment === '+' ? '*path' : '{*path}';
    });

    if (!converted) {
      return route;
    }

    const convertedRoute = convertedSegments.join('/');
    // Skip printing warning for the "all" wildcard.
    if (normalizedRoute !== '/*/' && normalizedRoute !== '/(.*)/') {
      printWarning(route, convertedRoute);
    }
    return convertedRoute;
  }

  static printError(route: string): void {
    this.logger.error(UNSUPPORTED_PATH_MESSAGE`${route}`);
  }

  static printWarning(route: string, convertedRoute?: string): void {
    // Surface the auto-converted result so users can map the flagged path to a
    // concrete fix, instead of only seeing the (often prefixed) offending path.
    const autoConvertMessage = convertedRoute
      ? ` Attempting to auto-convert to "${convertedRoute}"...`
      : ' Attempting to auto-convert...';
    this.logger.warn(UNSUPPORTED_PATH_MESSAGE`${route}` + autoConvertMessage);
  }
}
