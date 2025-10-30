# Interface: NestMiddleware\<TRequest, TResponse\>

Defined in: packages/common/interfaces/middleware/nest-middleware.interface.ts:6

## See

[Middleware](https://docs.nestjs.com/middleware)

## Public Api

## Type Parameters

### TRequest

`TRequest` = `any`

### TResponse

`TResponse` = `any`

## Methods

### use()

> **use**(`req`, `res`, `next`): `any`

Defined in: packages/common/interfaces/middleware/nest-middleware.interface.ts:7

#### Parameters

##### req

`TRequest`

##### res

`TResponse`

##### next

(`error?`) => `void`

#### Returns

`any`
