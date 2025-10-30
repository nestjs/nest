# Interface: ExceptionFilter\<T\>

Defined in: packages/common/interfaces/exceptions/exception-filter.interface.ts:10

Interface describing implementation of an exception filter.

## See

[Exception Filters](https://docs.nestjs.com/exception-filters)

## Public Api

## Type Parameters

### T

`T` = `any`

## Methods

### catch()

> **catch**(`exception`, `host`): `any`

Defined in: packages/common/interfaces/exceptions/exception-filter.interface.ts:18

Method to implement a custom exception filter.

#### Parameters

##### exception

`T`

the class of the exception being handled

##### host

[`ArgumentsHost`](ArgumentsHost.md)

used to access an array of arguments for
the in-flight request

#### Returns

`any`
