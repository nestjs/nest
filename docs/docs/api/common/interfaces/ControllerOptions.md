# Interface: ControllerOptions

Defined in: packages/common/decorators/core/controller.decorator.ts:16

Interface defining options that can be passed to `@Controller()` decorator

## Public Api

## Extends

- [`ScopeOptions`](ScopeOptions.md).`VersionOptions`

## Properties

### durable?

> `optional` **durable**: `boolean`

Defined in: packages/common/interfaces/scope-options.interface.ts:37

Flags provider as durable. This flag can be used in combination with custom context id
factory strategy to construct lazy DI subtrees.

This flag can be used only in conjunction with scope = Scope.REQUEST.

#### Inherited from

[`ScopeOptions`](ScopeOptions.md).[`durable`](ScopeOptions.md#durable)

***

### host?

> `optional` **host**: `string` \| `RegExp` \| (`string` \| `RegExp`)[]

Defined in: packages/common/decorators/core/controller.decorator.ts:34

Specifies an optional HTTP Request host filter.  When configured, methods
within the controller will only be routed if the request host matches the
specified value.

#### See

[Routing](https://docs.nestjs.com/controllers#routing)

***

### path?

> `optional` **path**: `string` \| `string`[]

Defined in: packages/common/decorators/core/controller.decorator.ts:25

Specifies an optional `route path prefix`.  The prefix is pre-pended to the
path specified in any request decorator in the class.

Supported only by HTTP-based applications (does not apply to non-HTTP microservices).

#### See

[Routing](https://docs.nestjs.com/controllers#routing)

***

### scope?

> `optional` **scope**: [`Scope`](../enumerations/Scope.md)

Defined in: packages/common/interfaces/scope-options.interface.ts:30

Specifies the lifetime of an injected Provider or Controller.

#### Inherited from

[`ScopeOptions`](ScopeOptions.md).[`scope`](ScopeOptions.md#scope)

***

### version?

> `optional` **version**: `VersionValue`

Defined in: packages/common/interfaces/version-options.interface.ts:31

Specifies an optional API Version. When configured, methods
within the controller will only be routed if the request version
matches the specified value.

Supported only by HTTP-based applications (does not apply to non-HTTP microservices).

#### See

[Versioning](https://docs.nestjs.com/techniques/versioning)

#### Inherited from

`VersionOptions.version`
