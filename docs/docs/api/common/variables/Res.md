# Variable: Res()

> `const` **Res**: (`options?`) => `ParameterDecorator` = `Response`

Defined in: packages/common/decorators/http/route-params.decorator.ts:771

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
