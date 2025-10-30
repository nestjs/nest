# Interface: WsExceptionFilter\<T\>

Defined in: packages/common/interfaces/exceptions/ws-exception-filter.interface.ts:11

Interface describing implementation of a Web Sockets exception filter.

## See

[Exception Filters](https://docs.nestjs.com/websockets/exception-filters)

## Public Api

## Type Parameters

### T

`T` = `any`

## Methods

### catch()

> **catch**(`exception`, `host`): `any`

Defined in: packages/common/interfaces/exceptions/ws-exception-filter.interface.ts:19

Method to implement a custom (web sockets) exception filter.

#### Parameters

##### exception

`T`

the type (class) of the exception being handled

##### host

[`ArgumentsHost`](ArgumentsHost.md)

used to access an array of arguments for
the in-flight message  catch(exception: T, host: ArgumentsHost): any;

#### Returns

`any`
