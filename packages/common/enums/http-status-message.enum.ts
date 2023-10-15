/**
 * @publicApi
 */
export enum HttpStatusMessage {
  CONTINUE = "Continue",
  SWITCHING_PROTOCOLS = "Switching Protocols",
  OK = "OK",
  CREATED = "Created",
  ACCEPTED = "Accepted",
  NON_AUTHORITATIVE_INFORMATION = "Non-Authoritative Information",
  NO_CONTENT = "No Content",
  RESET_CONTENT = "Reset Content",
  PARTIAL_CONTENT = "Partial Content",
  MULTIPLE_CHOICES = "Multiple Choices",
  AMBIGUOUS = "Ambiguous",
  MOVED_PERMANENTLY = "Moved Permanently",
  MOVED = "Moved",
  FOUND = "Found",
  REDIRECT = "Redirect",
  SEE_OTHER = "See Other",
  REDIRECT_METHOD = "Redirect Method",
  NOT_MODIFIED = "Not Modified",
  USE_PROXY = "Use Proxy",
  UNUSED = "(Unused)",
  TEMPORARY_REDIRECT = "Temporary Redirect",
  REDIRECT_KEEP_VERB = "Redirect Keep Verb",
  BAD_REQUEST = "Bad Request",
  UNAUTHORIZED = "Unauthorized",
  PAYMENT_REQUIRED = "Payment Required",
  FORBIDDEN = "Forbidden",
  NOT_FOUND = "Not Found",
  METHOD_NOT_ALLOWED = "Method Not Allowed",
  NOT_ACCEPTABLE = "Not Acceptable",
  PROXY_AUTHENTICATION_REQUIRED = "Proxy Authentication Required",
  REQUEST_TIMEOUT = "Request Timeout",
  CONFLICT = "Conflict",
  GONE = "Gone",
  LENGTH_REQUIRED = "Length Required",
  PRECONDITION_FAILED = "Precondition Failed",
  REQUEST_ENTITY_TOO_LARGE = "Request Entity Too Large",
  REQUEST_URI_TOO_LONG = "Request-URI Too Long",
  UNSUPPORTED_MEDIA_TYPE = "Unsupported Media Type",
  REQUESTED_RANGE_NOT_SATISFIABLE = "Requested Range Not Satisfiable",
  EXPECTATION_FAILED = "Expectation Failed",
  UPGRADE_REQUIRED = "Upgrade Required",
  INTERNAL_SERVER_ERROR = "Internal Server Error",
  NOT_IMPLEMENTED = "Not Implemented",
  BAD_GATEWAY = "Bad Gateway",
  SERVICE_UNAVAILABLE = "Service Unavailable",
  GATEWAY_TIMEOUT = "Gateway Timeout",
  HTTP_VERSION_NOT_SUPPORTED = "HTTP Version Not Supported"
}
