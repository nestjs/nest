import { VersioningType } from '../enums/version-type.enum';

/**
 * Indicates that this will work for any version passed in the request, or no version.
 *
 * @publicApi
 */
export const VERSION_NEUTRAL = Symbol('VERSION_NEUTRAL');

export type VersionValue = string | string[] | typeof VERSION_NEUTRAL;

/**
 * @publicApi
 */
export interface VersionOptions {
  /**
   * Specifies an optional API Version. When configured, methods
   * withing the controller will only be routed if the request version
   * matches the specified value.
   *
   * Supported only by HTTP-based applications (does not apply to non-HTTP microservices).
   *
   * @see [Versioning](https://docs.nestjs.com/techniques/versioning)
   */
  version?: VersionValue;
}

export interface HeaderVersioningOptions {
  type: VersioningType.HEADER;
  /**
   * The name of the Request Header that contains the version.
   */
  header: string;
}

export interface UriVersioningOptions {
  type: VersioningType.URI;
  /**
   * Optional prefix that will prepend the version within the URI.
   *
   * Defaults to `v`.
   *
   * Ex. Assuming a version of `1`, for `/api/v1/route`, `v` is the prefix.
   */
  prefix?: string | false;
}

export interface MediaTypeVersioningOptions {
  type: VersioningType.MEDIA_TYPE;
  /**
   * The key within the Media Type Header to determine the version from.
   *
   * Ex. For `application/json;v=1`, the key is `v=`.
   */
  key: string;
}

/**
 * @publicApi
 */
export type VersioningOptions =
  | HeaderVersioningOptions
  | UriVersioningOptions
  | MediaTypeVersioningOptions;
