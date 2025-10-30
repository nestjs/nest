# Class: BaseExceptionFilter\<T\>

Defined in: packages/core/exceptions/base-exception-filter.ts:17

Interface describing implementation of an exception filter.

## See

[Exception Filters](https://docs.nestjs.com/exception-filters)

## Public Api

## Type Parameters

### T

`T` = `any`

## Implements

- [`ExceptionFilter`](../../common/interfaces/ExceptionFilter.md)\<`T`\>

## Constructors

### Constructor

> **new BaseExceptionFilter**\<`T`\>(`applicationRef?`): `BaseExceptionFilter`\<`T`\>

Defined in: packages/core/exceptions/base-exception-filter.ts:24

#### Parameters

##### applicationRef?

[`HttpServer`](../../common/interfaces/HttpServer.md)\<`any`, `any`, `any`\>

#### Returns

`BaseExceptionFilter`\<`T`\>

## Properties

### applicationRef?

> `protected` `readonly` `optional` **applicationRef**: [`HttpServer`](../../common/interfaces/HttpServer.md)\<`any`, `any`, `any`\>

Defined in: packages/core/exceptions/base-exception-filter.ts:24

***

### httpAdapterHost?

> `protected` `readonly` `optional` **httpAdapterHost**: [`HttpAdapterHost`](HttpAdapterHost.md)\<[`AbstractHttpAdapter`](AbstractHttpAdapter.md)\<`any`, `any`, `any`\>\>

Defined in: packages/core/exceptions/base-exception-filter.ts:22

## Methods

### catch()

> **catch**(`exception`, `host`): `void`

Defined in: packages/core/exceptions/base-exception-filter.ts:26

Method to implement a custom exception filter.

#### Parameters

##### exception

`T`

the class of the exception being handled

##### host

[`ArgumentsHost`](../../common/interfaces/ArgumentsHost.md)

used to access an array of arguments for
the in-flight request

#### Returns

`void`

#### Implementation of

[`ExceptionFilter`](../../common/interfaces/ExceptionFilter.md).[`catch`](../../common/interfaces/ExceptionFilter.md#catch)

***

### handleUnknownError()

> **handleUnknownError**(`exception`, `host`, `applicationRef`): `void`

Defined in: packages/core/exceptions/base-exception-filter.ts:50

#### Parameters

##### exception

`T`

##### host

[`ArgumentsHost`](../../common/interfaces/ArgumentsHost.md)

##### applicationRef

[`HttpServer`](../../common/interfaces/HttpServer.md)\<`any`, `any`, `any`\> | [`AbstractHttpAdapter`](AbstractHttpAdapter.md)\<`any`, `any`, `any`\>

#### Returns

`void`

***

### isExceptionObject()

> **isExceptionObject**(`err`): `err is Error`

Defined in: packages/core/exceptions/base-exception-filter.ts:77

#### Parameters

##### err

`any`

#### Returns

`err is Error`

***

### isHttpError()

> **isHttpError**(`err`): `err is { message: string; statusCode: number }`

Defined in: packages/core/exceptions/base-exception-filter.ts:85

Checks if the thrown error comes from the "http-errors" library.

#### Parameters

##### err

`any`

error object

#### Returns

`err is { message: string; statusCode: number }`
