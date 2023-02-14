import { uid } from 'uid';
import { INJECTABLE_WATERMARK, SCOPE_OPTIONS_METADATA } from '../../constants';
import { ScopeOptions } from '../../interfaces/scope-options.interface';
import { Type } from '../../interfaces/type.interface';

/**
 * Defines the injection scope.
 *
 * @see [Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
 *
 * @publicApi
 */
export type InjectableOptions = ScopeOptions;

/**
 * Decorator that marks a class as a [provider](https://docs.nestjs.com/providers).
 * Providers can be injected into other classes via constructor parameter injection
 * using Nest's built-in [Dependency Injection (DI)](https://docs.nestjs.com/providers#dependency-injection)
 * system.
 *
 * When injecting a provider, it must be visible within the module scope (loosely
 * speaking, the containing module) of the class it is being injected into. This
 * can be done by:
 *
 * - defining the provider in the same module scope
 * - exporting the provider from one module scope and importing that module into the
 *   module scope of the class being injected into
 * - exporting the provider from a module that is marked as global using the
 *   `@Global()` decorator
 *
 * Providers can also be defined in a more explicit and imperative form using
 * various [custom provider](https://docs.nestjs.com/fundamentals/custom-providers) techniques that expose
 * more capabilities of the DI system.
 *
 * @param options options specifying scope of injectable
 *
 * @see [Providers](https://docs.nestjs.com/providers)
 * @see [Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
 * @see [Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
 *
 * @publicApi
 */
export function Injectable(options?: InjectableOptions): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options, target);
  };
}

/**
 * @publicApi
 */
export function mixin<T>(mixinClass: Type<T>) {
  Object.defineProperty(mixinClass, 'name', {
    value: uid(21),
  });
  Injectable()(mixinClass);
  return mixinClass;
}
