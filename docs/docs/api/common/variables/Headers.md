# Variable: Headers()

> `const` **Headers**: (`property?`) => `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:325

Route handler parameter decorator. Extracts the `headers`
property from the `req` object and populates the decorated
parameter with the value of `headers`.

For example: `async update(@Headers('Cache-Control') cacheControl: string)`

## Parameters

### property?

`string`

name of single header property to extract.

## Returns

`ParameterDecorator`

## See

[Request object](https://docs.nestjs.com/controllers#request-object)

## Public Api
