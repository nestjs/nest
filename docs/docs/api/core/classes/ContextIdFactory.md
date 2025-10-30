# Class: ContextIdFactory

Defined in: packages/core/helpers/context-id-factory.ts:43

## Constructors

### Constructor

> **new ContextIdFactory**(): `ContextIdFactory`

#### Returns

`ContextIdFactory`

## Methods

### apply()

> `static` **apply**(`strategy`): `void`

Defined in: packages/core/helpers/context-id-factory.ts:91

Registers a custom context id strategy that lets you attach
a parent context id to the existing context id object.

#### Parameters

##### strategy

[`ContextIdStrategy`](../interfaces/ContextIdStrategy.md)

strategy instance

#### Returns

`void`

***

### create()

> `static` **create**(): [`ContextId`](../interfaces/ContextId.md)

Defined in: packages/core/helpers/context-id-factory.ts:49

Generates a context identifier based on the request object.

#### Returns

[`ContextId`](../interfaces/ContextId.md)

***

### getByRequest()

> `static` **getByRequest**\<`T`\>(`request`, `propsToInspect`): [`ContextId`](../interfaces/ContextId.md)

Defined in: packages/core/helpers/context-id-factory.ts:57

Generates a random identifier to track asynchronous execution context.

#### Type Parameters

##### T

`T` *extends* `Record`\<`any`, `any`\> = `any`

#### Parameters

##### request

`T`

request object

##### propsToInspect

`string`[] = `...`

#### Returns

[`ContextId`](../interfaces/ContextId.md)
