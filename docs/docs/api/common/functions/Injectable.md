# Function: Injectable()

> **Injectable**(`options?`): `ClassDecorator`

Defined in: packages/common/decorators/core/injectable.decorator.ts:43

Decorator that marks a class as a [provider](https://docs.nestjs.com/providers).
Providers can be injected into other classes via constructor parameter injection
using Nest's built-in [Dependency Injection (DI)](https://docs.nestjs.com/providers#dependency-injection)
system.

When injecting a provider, it must be visible within the module scope (loosely
speaking, the containing module) of the class it is being injected into. This
can be done by:

- defining the provider in the same module scope
- exporting the provider from one module scope and importing that module into the
  module scope of the class being injected into
- exporting the provider from a module that is marked as global using the
  `@Global()` decorator

Providers can also be defined in a more explicit and imperative form using
various [custom provider](https://docs.nestjs.com/fundamentals/custom-providers) techniques that expose
more capabilities of the DI system.

## Parameters

### options?

[`ScopeOptions`](../interfaces/ScopeOptions.md)

options specifying scope of injectable

## Returns

`ClassDecorator`

## See

 - [Providers](https://docs.nestjs.com/providers)
 - [Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
 - [Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)

## Public Api
