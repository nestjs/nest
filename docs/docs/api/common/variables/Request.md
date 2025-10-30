# Variable: Request()

> `const` **Request**: () => `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:99

Route handler parameter decorator. Extracts the `Request`
object from the underlying platform and populates the decorated
parameter with the value of `Request`.

Example: `logout(@Request() req)`

## Returns

`ParameterDecorator`

## See

[Request object](https://docs.nestjs.com/controllers#request-object)

## Public Api
