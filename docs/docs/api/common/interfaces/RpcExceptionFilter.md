# Interface: RpcExceptionFilter\<T, R\>

Defined in: packages/common/interfaces/exceptions/rpc-exception-filter.interface.ts:11

Interface describing implementation of an RPC exception filter.

## See

[Exception Filters](https://docs.nestjs.com/microservices/exception-filters)

## Public Api

## Type Parameters

### T

`T` = `any`

### R

`R` = `any`

## Methods

### catch()

> **catch**(`exception`, `host`): `Observable`\<`R`\>

Defined in: packages/common/interfaces/exceptions/rpc-exception-filter.interface.ts:19

Method to implement a custom (microservice) exception filter.

#### Parameters

##### exception

`T`

the type (class) of the exception being handled

##### host

[`ArgumentsHost`](ArgumentsHost.md)

used to access an array of arguments for
the in-flight message

#### Returns

`Observable`\<`R`\>
