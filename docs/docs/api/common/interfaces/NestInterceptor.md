# Interface: NestInterceptor\<T, R\>

Defined in: packages/common/interfaces/features/nest-interceptor.interface.ts:27

Interface describing implementation of an interceptor.

## See

[Interceptors](https://docs.nestjs.com/interceptors)

## Public Api

## Type Parameters

### T

`T` = `any`

### R

`R` = `any`

## Methods

### intercept()

> **intercept**(`context`, `next`): `any`

Defined in: packages/common/interfaces/features/nest-interceptor.interface.ts:36

Method to implement a custom interceptor.

#### Parameters

##### context

[`ExecutionContext`](ExecutionContext.md)

an `ExecutionContext` object providing methods to access the
route handler and class about to be invoked.

##### next

[`CallHandler`](CallHandler.md)\<`T`\>

a reference to the `CallHandler`, which provides access to an
`Observable` representing the response stream from the route handler.

#### Returns

`any`
