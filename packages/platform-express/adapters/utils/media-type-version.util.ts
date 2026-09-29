/**
 * Extracts the API version carried by an `Accept` header when media type
 * versioning is enabled, e.g. `application/json;v=2`.
 *
 * The header is parsed as a list of media ranges (`,`), each with its own
 * parameters (`;`), as HTTP clients and browsers send it. The version is the
 * first parameter (of any media range) that starts with the configured `key`;
 * its position among the parameters and the presence of other ranges do not
 * matter. Returns `undefined` when no version parameter is present.
 *
 * Kept in each platform package on purpose rather than shared through
 * `@nestjs/core/internal`, so that upgrading one package ahead of the other
 * cannot break compilation.
 */
export function extractVersionFromAcceptHeader(
  acceptHeader: string | string[] | undefined,
  key: string,
): string | undefined {
  if (!acceptHeader) {
    return undefined;
  }
  const header = Array.isArray(acceptHeader)
    ? acceptHeader.join(',')
    : acceptHeader;

  for (const mediaRange of header.split(',')) {
    const [, ...parameters] = mediaRange.split(';');
    for (const parameter of parameters) {
      const trimmed = parameter.trim();
      if (trimmed.startsWith(key)) {
        return trimmed.slice(key.length).trim();
      }
    }
  }
  return undefined;
}
