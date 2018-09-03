import * as deprecate from 'deprecate';
import * as uuid from 'uuid/v4';

/**
 * Defines the injectable class. This class can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
export function Injectable(): ClassDecorator {
  return (target: object) => {};
}

/**
 * @deprecated
 * Defines the Component. The component can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
export function Component(): ClassDecorator {
  deprecate(
    'The @Component() decorator is deprecated and will be removed within next major release. Use @Injectable() instead.',
  );
  return (target: object) => {};
}

/**
 * @deprecated
 * Defines the Pipe. The Pipe should implement the `PipeTransform` interface.
 */
export function Pipe(): ClassDecorator {
  deprecate(
    'The @Pipe() decorator is deprecated and will be removed within next major release. Use @Injectable() instead.',
  );
  return (target: object) => {};
}

/**
 * @deprecated
 * Defines the Guard. The Guard should implement the `CanActivate` interface.
 */
export function Guard(): ClassDecorator {
  deprecate(
    'The @Guard() decorator is deprecated and will be removed within next major release. Use @Injectable() instead.',
  );
  return (target: object) => {};
}

/**
 * @deprecated
 * Defines the Middleware. The Middleware should implement the `NestMiddleware` interface.
 */
export function Middleware(): ClassDecorator {
  deprecate(
    'The @Middleware() decorator is deprecated and will be removed within next major release. Use @Injectable() instead.',
  );
  return (target: object) => {};
}

/**
 * @deprecated
 * Defines the Interceptor. The Interceptor should implement `HttpInterceptor`, `RpcInterceptor` or `WsInterceptor` interface.
 */
export function Interceptor(): ClassDecorator {
  deprecate(
    'The @Interceptor() decorator is deprecated and will be removed within next major release. Use @Injectable() instead.',
  );
  return (target: object) => {};
}

export function mixin(mixinClass) {
  Object.defineProperty(mixinClass, 'name', {
    value: uuid(),
  });
  Injectable()(mixinClass);
  return mixinClass;
}
