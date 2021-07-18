import { HEADERS_METADATA } from '../../constants';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';

type headerNames =
// Standard response fields:
// https://en.wikipedia.org/wiki/List_of_HTTP_header_fields#Standard_response_fields
  'Accept-CH' |
  'Access-Control-Allow-Origin' |
  'Access-Control-Allow-Credentials' |
  'Access-Control-Expose-Headers' |
  'Access-Control-Max-Age' |
  'Access-Control-Allow-Methods' |
  'Access-Control-Allow-Headers' |
  'Accept-Patch' |
  'Accept-Ranges' |
  'Age' |
  'Allow' |
  'Alt-Svc' |
  'Cache-Control' |
  'Connection' |
  'Content-Disposition' |
  'Content-Encoding' |
  'Content-Language' |
  'Content-Length' |
  'Content-Location' |
  'Content-MD5' |
  'Content-Range' |
  'Content-Type' |
  'Date' |
  'Delta-Base' |
  'ETag' |
  'Expires' |
  'IM' |
  'Last-Modified' |
  'Link' |
  'Location' |
  'P3P' |
  'Pragma' |
  'Preference-Applied' |
  'Proxy-Authenticate' |
  'Public-Key-Pins' |
  'Retry-After' |
  'Server' |
  'Set-Cookie' |
  'Strict-Transport-Security' |
  'Trailer' |
  'Transfer-Encoding' |
  'Tk' |
  'Upgrade' |
  'Vary' |
  'Via' |
  'Warning' |
  'WWW-Authenticate' |
  'X-Frame-Options' |
  // Common non-standard response fields
  // https://en.wikipedia.org/wiki/List_of_HTTP_header_fields#Common_non-standard_response_field
  'Content-Security-Policy' |
  'X-Content-Security-Policy' |
  'X-WebKit-CSP' |
  'NEL' |
  'Permissions-Policy' |
  'Refresh' |
  'Report-To' |
  'Status' |
  'Timing-Allow-Origin' |
  'X-Content-Duration' |
  'X-Content-Type-Options' |
  'X-Powered-By' |
  'X-Redirect-By' |
  'X-Request-ID' |
  'X-Correlation-ID' |
  'X-UA-Compatible' |
  'X-XSS-Protection';

// Will give the user autocomplete options from the headerNames list, will also accept any string
type HeaderName = headerNames | string;

/**
 * Request method Decorator.  Sets a response header.
 *
 * For example:
 * `@Header('Cache-Control', 'none')`
 *
 * @param name string to be used for header name
 * @param value string to be used for header value
 *
 * @see [Headers](https://docs.nestjs.com/controllers#headers)
 *
 * @publicApi
 */
export function Header(name: HeaderName, value: string): MethodDecorator {
  return (
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    extendArrayMetadata(HEADERS_METADATA, [{ name, value }], descriptor.value);
    return descriptor;
  };
}