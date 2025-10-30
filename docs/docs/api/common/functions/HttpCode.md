# Function: HttpCode()

> **HttpCode**(`statusCode`): `MethodDecorator`

Defined in: packages/common/decorators/http/http-code.decorator.ts:13

Request method Decorator.  Defines the HTTP response status code.  Overrides
default status code for the decorated request method.

## Parameters

### statusCode

`number`

HTTP response code to be returned by route handler.

## Returns

`MethodDecorator`

## See

[Http Status Codes](https://docs.nestjs.com/controllers#status-code)

## Public Api
