# Interface: MiddlewareConsumer

Defined in: packages/common/interfaces/middleware/middleware-consumer.interface.ts:11

Interface defining method for applying user defined middleware to routes.

## See

[MiddlewareConsumer](https://docs.nestjs.com/middleware#middleware-consumer)

## Public Api

## Methods

### apply()

> **apply**(...`middleware`): `MiddlewareConfigProxy`

Defined in: packages/common/interfaces/middleware/middleware-consumer.interface.ts:18

#### Parameters

##### middleware

...(`Function` \| [`Type`](Type.md)\<`any`\>)[]

middleware class/function or array of classes/functions
to be attached to the passed routes.

#### Returns

`MiddlewareConfigProxy`
