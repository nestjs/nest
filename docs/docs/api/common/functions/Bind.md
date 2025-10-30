# Function: Bind()

> **Bind**(...`decorators`): `MethodDecorator`

Defined in: packages/common/decorators/core/bind.decorator.ts:11

Decorator that binds *parameter decorators* to the method that follows.

Useful when the language doesn't provide a 'Parameter Decorator' feature
(i.e., vanilla JavaScript).

## Parameters

### decorators

...`any`[]

one or more parameter decorators (e.g., `Req()`)

## Returns

`MethodDecorator`

## Public Api
