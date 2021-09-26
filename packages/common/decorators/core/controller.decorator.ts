import {
  HOST_METADATA,
  PATH_METADATA,
  SCOPE_OPTIONS_METADATA,
  VERSION_METADATA,
} from '../../constants';
import { ScopeOptions } from '../../interfaces/scope-options.interface';
import { VersionOptions } from '../../interfaces/version-options.interface';
import { isString, isUndefined } from '../../utils/shared.utils';

/**
 * Interface defining options that can be passed to `@Controller()` decorator
 *
 * @publicApi
 */
export interface ControllerOptions extends ScopeOptions, VersionOptions {
  /**
   * Specifies an optional `route path prefix`.  The prefix is pre-pended to the
   * path specified in any request decorator in the class.
   *
   * Supported only by HTTP-based applications (does not apply to non-HTTP microservices).
   *
   * @see [Routing](https://docs.nestjs.com/controllers#routing)
   */
  path?: string | string[];

  /**
   * Specifies an optional HTTP Request host filter.  When configured, methods
   * within the controller will only be routed if the request host matches the
   * specified value.
   *
   * @see [Routing](https://docs.nestjs.com/controllers#routing)
   */
  host?: string | RegExp | Array<string | RegExp>;
}

/**
 * Decorator that marks a class as a Nest controller that can receive inbound
 * requests and produce responses.
 *
 * An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
 * It defines a class that provides the context for one or more related route
 * handlers that correspond to HTTP request methods and associated routes
 * for example `GET /api/profile`, `POST /users/resume`.
 *
 * A Microservice Controller responds to requests as well as events, running over
 * a variety of transports [(read more here)](https://docs.nestjs.com/microservices/basics).
 * It defines a class that provides a context for one or more message or event
 * handlers.
 *
 * @see [Controllers](https://docs.nestjs.com/controllers)
 * @see [Microservices](https://docs.nestjs.com/microservices/basics#request-response)
 *
 * @publicApi
 */
export function Controller(): ClassDecorator;

/**
 * Decorator that marks a class as a Nest controller that can receive inbound
 * requests and produce responses.
 *
 * An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
 * It defines a class that provides the context for one or more related route
 * handlers that correspond to HTTP request methods and associated routes
 * for example `GET /api/profile`, `POST /users/resume`.
 *
 * A Microservice Controller responds to requests as well as events, running over
 * a variety of transports [(read more here)](https://docs.nestjs.com/microservices/basics).
 * It defines a class that provides a context for one or more message or event
 * handlers.
 *
 * @param {string, Array} prefix string that defines a `route path prefix`.  The prefix
 * is pre-pended to the path specified in any request decorator in the class.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 * @see [Controllers](https://docs.nestjs.com/controllers)
 * @see [Microservices](https://docs.nestjs.com/microservices/basics#request-response)
 *
 * @publicApi
 */
export function Controller(prefix: string | string[]): ClassDecorator;

/**
 * Decorator that marks a class as a Nest controller that can receive inbound
 * requests and produce responses.
 *
 * An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
 * It defines a class that provides the context for one or more related route
 * handlers that correspond to HTTP request methods and associated routes
 * for example `GET /api/profile`, `POST /users/resume`.
 *
 * A Microservice Controller responds to requests as well as events, running over
 * a variety of transports [(read more here)](https://docs.nestjs.com/microservices/basics).
 * It defines a class that provides a context for one or more message or event
 * handlers.
 *
 * @param {object} options configuration object specifying:
 *
 * - `scope` - symbol that determines the lifetime of a Controller instance.
 * [See Scope](https://docs.nestjs.com/fundamentals/injection-scopes#usage) for
 * more details.
 * - `prefix` - string that defines a `route path prefix`.  The prefix
 * is pre-pended to the path specified in any request decorator in the class.
 * - `version` - string, array of strings, or Symbol that defines the version
 * of all routes in the class. [See Versioning](https://docs.nestjs.com/techniques/versioning)
 * for more details.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 * @see [Controllers](https://docs.nestjs.com/controllers)
 * @see [Microservices](https://docs.nestjs.com/microservices/basics#request-response)
 * @see [Versioning](https://docs.nestjs.com/techniques/versioning)
 *
 * @publicApi
 */
export function Controller(options: ControllerOptions): ClassDecorator;

/**
 * Decorator that marks a class as a Nest controller that can receive inbound
 * requests and produce responses.
 *
 * An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
 * It defines a class that provides the context for one or more related route
 * handlers that correspond to HTTP request methods and associated routes
 * for example `GET /api/profile`, `POST /users/resume`
 *
 * A Microservice Controller responds to requests as well as events, running over
 * a variety of transports [(read more here)](https://docs.nestjs.com/microservices/basics).
 * It defines a class that provides a context for one or more message or event
 * handlers.
 *
 * @param prefixOrOptions a `route path prefix` or a `ControllerOptions` object.
 * A `route path prefix` is pre-pended to the path specified in any request decorator
 * in the class. `ControllerOptions` is an options configuration object specifying:
 * - `scope` - symbol that determines the lifetime of a Controller instance.
 * [See Scope](https://docs.nestjs.com/fundamentals/injection-scopes#usage) for
 * more details.
 * - `prefix` - string that defines a `route path prefix`.  The prefix
 * is pre-pended to the path specified in any request decorator in the class.
 * - `version` - string, array of strings, or Symbol that defines the version
 * of all routes in the class. [See Versioning](https://docs.nestjs.com/techniques/versioning)
 * for more details.
 *
 * @see [Routing](https://docs.nestjs.com/controllers#routing)
 * @see [Controllers](https://docs.nestjs.com/controllers)
 * @see [Microservices](https://docs.nestjs.com/microservices/basics#request-response)
 * @see [Scope](https://docs.nestjs.com/fundamentals/injection-scopes#usage)
 * @see [Versioning](https://docs.nestjs.com/techniques/versioning)
 *
 * @publicApi
 */
export function Controller(
  prefixOrOptions?: string | string[] | ControllerOptions,
): ClassDecorator {
  const defaultPath = '/';

  const [path, host, scopeOptions, versionOptions] = isUndefined(
    prefixOrOptions,
  )
    ? [defaultPath, undefined, undefined, undefined]
    : isString(prefixOrOptions) || Array.isArray(prefixOrOptions)
    ? [prefixOrOptions, undefined, undefined, undefined]
    : [
        prefixOrOptions.path || defaultPath,
        prefixOrOptions.host,
        { scope: prefixOrOptions.scope },
        prefixOrOptions.version,
      ];

  return (target: object) => {
    Reflect.defineMetadata(PATH_METADATA, path, target);
    Reflect.defineMetadata(HOST_METADATA, host, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, scopeOptions, target);
    Reflect.defineMetadata(VERSION_METADATA, versionOptions, target);
  };
}
