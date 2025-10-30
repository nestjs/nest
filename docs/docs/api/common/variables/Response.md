# Variable: Response()

> `const` **Response**: (`options?`) => `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:112

Route handler parameter decorator. Extracts the `Response`
object from the underlying platform and populates the decorated
parameter with the value of `Response`.

Example: `logout(@Response() res)`

## Parameters

### options?

[`ResponseDecoratorOptions`](../interfaces/ResponseDecoratorOptions.md)

## Returns

`ParameterDecorator`

## Public Api
