# Interface: ArgumentMetadata

Defined in: packages/common/interfaces/features/pipe-transform.interface.ts:13

Interface describing a pipe implementation's `transform()` method metadata argument.

## See

[Pipes](https://docs.nestjs.com/pipes)

## Public Api

## Properties

### data?

> `readonly` `optional` **data**: `string`

Defined in: packages/common/interfaces/features/pipe-transform.interface.ts:27

String passed as an argument to the decorator.
Example: `@Body('userId')` would yield `userId`

***

### metatype?

> `readonly` `optional` **metatype**: [`Type`](Type.md)\<`any`\>

Defined in: packages/common/interfaces/features/pipe-transform.interface.ts:22

Underlying base type (e.g., `String`) of the parameter, based on the type
definition in the route handler.

***

### type

> `readonly` **type**: [`Paramtype`](../type-aliases/Paramtype.md)

Defined in: packages/common/interfaces/features/pipe-transform.interface.ts:17

Indicates whether argument is a body, query, param, or custom parameter
