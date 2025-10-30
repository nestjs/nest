# Function: UseGuards()

> **UseGuards**(...`guards`): `MethodDecorator` & `ClassDecorator`

Defined in: packages/common/decorators/core/use-guards.decorator.ts:28

Decorator that binds guards to the scope of the controller or method,
depending on its context.

When `@UseGuards` is used at the controller level, the guard will be
applied to every handler (method) in the controller.

When `@UseGuards` is used at the individual handler level, the guard
will apply only to that specific method.

## Parameters

### guards

...(`Function` \| [`CanActivate`](../interfaces/CanActivate.md))[]

a single guard instance or class, or a list of guard instances
or classes.

## Returns

`MethodDecorator` & `ClassDecorator`

## See

[Guards](https://docs.nestjs.com/guards)

## Usage Notes

Guards can also be set up globally for all controllers and routes
using `app.useGlobalGuards()`.  [See here for details](https://docs.nestjs.com/guards#binding-guards)

## Public Api
