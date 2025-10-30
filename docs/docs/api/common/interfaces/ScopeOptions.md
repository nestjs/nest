# Interface: ScopeOptions

Defined in: packages/common/interfaces/scope-options.interface.ts:26

## Public Api

## See

[Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)

## Extended by

- [`ControllerOptions`](ControllerOptions.md)

## Properties

### durable?

> `optional` **durable**: `boolean`

Defined in: packages/common/interfaces/scope-options.interface.ts:37

Flags provider as durable. This flag can be used in combination with custom context id
factory strategy to construct lazy DI subtrees.

This flag can be used only in conjunction with scope = Scope.REQUEST.

***

### scope?

> `optional` **scope**: [`Scope`](../enumerations/Scope.md)

Defined in: packages/common/interfaces/scope-options.interface.ts:30

Specifies the lifetime of an injected Provider or Controller.
