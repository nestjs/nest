# Class: MiddlewareBuilder

Defined in: packages/core/middleware/builder.ts:17

Interface defining method for applying user defined middleware to routes.

## See

[MiddlewareConsumer](https://docs.nestjs.com/middleware#middleware-consumer)

## Public Api

## Implements

- [`MiddlewareConsumer`](../../common/interfaces/MiddlewareConsumer.md)

## Constructors

### Constructor

> **new MiddlewareBuilder**(`routesMapper`, `httpAdapter`, `routeInfoPathExtractor`): `MiddlewareBuilder`

Defined in: packages/core/middleware/builder.ts:20

#### Parameters

##### routesMapper

`RoutesMapper`

##### httpAdapter

[`HttpServer`](../../common/interfaces/HttpServer.md)

##### routeInfoPathExtractor

`RouteInfoPathExtractor`

#### Returns

`MiddlewareBuilder`

## Methods

### apply()

> **apply**(...`middleware`): `MiddlewareConfigProxy`

Defined in: packages/core/middleware/builder.ts:26

#### Parameters

##### middleware

...(`Function` \| [`Type`](../../common/interfaces/Type.md)\<`any`\> \| (`Function` \| [`Type`](../../common/interfaces/Type.md)\<`any`\>)[])[]

middleware class/function or array of classes/functions
to be attached to the passed routes.

#### Returns

`MiddlewareConfigProxy`

#### Implementation of

[`MiddlewareConsumer`](../../common/interfaces/MiddlewareConsumer.md).[`apply`](../../common/interfaces/MiddlewareConsumer.md#apply)

***

### build()

> **build**(): `MiddlewareConfiguration`\<`any`\>[]

Defined in: packages/core/middleware/builder.ts:36

#### Returns

`MiddlewareConfiguration`\<`any`\>[]

***

### getHttpAdapter()

> **getHttpAdapter**(): [`HttpServer`](../../common/interfaces/HttpServer.md)

Defined in: packages/core/middleware/builder.ts:40

#### Returns

[`HttpServer`](../../common/interfaces/HttpServer.md)
