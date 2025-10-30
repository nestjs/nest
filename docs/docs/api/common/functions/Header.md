# Function: Header()

> **Header**(`name`, `value`): `MethodDecorator`

Defined in: packages/common/decorators/http/header.decorator.ts:18

Request method Decorator.  Sets a response header.

For example:
`@Header('Cache-Control', 'none')`
`@Header('Cache-Control', () => 'none')`

## Parameters

### name

`string`

string to be used for header name

### value

string to be used for header value

`string` | () => `string`

## Returns

`MethodDecorator`

## See

[Headers](https://docs.nestjs.com/controllers#headers)

## Public Api
