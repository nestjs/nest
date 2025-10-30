# Function: UsePipes()

> **UsePipes**(...`pipes`): `ClassDecorator` & `MethodDecorator`

Defined in: packages/common/decorators/core/use-pipes.decorator.ts:29

Decorator that binds pipes to the scope of the controller or method,
depending on its context.

When `@UsePipes` is used at the controller level, the pipe will be
applied to every handler (method) in the controller.

When `@UsePipes` is used at the individual handler level, the pipe
will apply only to that specific method.

## Parameters

### pipes

...(`Function` \| [`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>)[]

a single pipe instance or class, or a list of pipe instances or
classes.

## Returns

`ClassDecorator` & `MethodDecorator`

## See

[Pipes](https://docs.nestjs.com/pipes)

## Usage Notes

Pipes can also be set up globally for all controllers and routes
using `app.useGlobalPipes()`.  [See here for details](https://docs.nestjs.com/pipes#class-validator)

## Public Api
