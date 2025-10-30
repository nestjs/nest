# Function: Module()

> **Module**(`metadata`): `ClassDecorator`

Defined in: packages/common/decorators/modules/module.decorator.ts:18

Decorator that marks a class as a [module](https://docs.nestjs.com/modules).

Modules are used by Nest to organize the application structure into scopes. Controllers
and Providers are scoped by the module they are declared in. Modules and their
classes (Controllers and Providers) form a graph that determines how Nest
performs [Dependency Injection (DI)](https://docs.nestjs.com/providers#dependency-injection).

## Parameters

### metadata

[`ModuleMetadata`](../interfaces/ModuleMetadata.md)

module configuration metadata

## Returns

`ClassDecorator`

## See

[Modules](https://docs.nestjs.com/modules)

## Public Api
