import type { IncomingMessage } from 'http';
import type { NodeResponse } from '../node-request.js';

/**
 * Sets the `Content-Type` of a text body: `fallback` when there is none, and
 * the charset `set()` adds for a MIME type set through `setHeader()`. A value
 * with a charset, or without a `/`, is sent as it is.
 */
export function setTextContentType(
  response: NodeResponse<IncomingMessage>,
  fallback: string,
) {
  const type = response.getHeader('Content-Type');
  if (type === undefined) {
    response.setHeader('Content-Type', fallback);
  } else if (
    typeof type === 'string' &&
    type.includes('/') &&
    // mime-types only spots a lowercase "charset"
    !/;\s*charset\s*=/i.test(type)
  ) {
    response.set('Content-Type', type);
  }
}
