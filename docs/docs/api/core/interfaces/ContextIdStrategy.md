# Interface: ContextIdStrategy\<T\>

Defined in: packages/core/helpers/context-id-factory.ts:30

## Type Parameters

### T

`T` = `any`

## Methods

### attach()

> **attach**(`contextId`, `request`): [`ContextIdResolverFn`](../type-aliases/ContextIdResolverFn.md) \| [`ContextIdResolver`](ContextIdResolver.md) \| `undefined`

Defined in: packages/core/helpers/context-id-factory.ts:37

Allows to attach a parent context id to the existing child context id.
This lets you construct durable DI sub-trees that can be shared between contexts.

#### Parameters

##### contextId

[`ContextId`](ContextId.md)

auto-generated child context id

##### request

`T`

request object

#### Returns

[`ContextIdResolverFn`](../type-aliases/ContextIdResolverFn.md) \| [`ContextIdResolver`](ContextIdResolver.md) \| `undefined`
