# Interface: CallHandler\<T\>

Defined in: packages/common/interfaces/features/nest-interceptor.interface.ts:11

Interface providing access to the response stream.

## See

[Interceptors](https://docs.nestjs.com/interceptors)

## Public Api

## Type Parameters

### T

`T` = `any`

## Methods

### handle()

> **handle**(): `Observable`\<`T`\>

Defined in: packages/common/interfaces/features/nest-interceptor.interface.ts:16

Returns an `Observable` representing the response stream from the route
handler.

#### Returns

`Observable`\<`T`\>
