# Function: UseFilters()

> **UseFilters**(...`filters`): `MethodDecorator` & `ClassDecorator`

Defined in: packages/common/decorators/core/exception-filters.decorator.ts:29

Decorator that binds exception filters to the scope of the controller or
method, depending on its context.

When `@UseFilters` is used at the controller level, the filter will be
applied to every handler (method) in the controller.

When `@UseFilters` is used at the individual handler level, the filter
will apply only to that specific method.

## Parameters

### filters

...(`Function` \| [`ExceptionFilter`](../interfaces/ExceptionFilter.md)\<`any`\>)[]

exception filter instance or class, or a list of exception
filter instances or classes.

## Returns

`MethodDecorator` & `ClassDecorator`

## See

[Exception filters](https://docs.nestjs.com/exception-filters)

## Usage Notes

Exception filters can also be set up globally for all controllers and routes
using `app.useGlobalFilters()`.  [See here for details](https://docs.nestjs.com/exception-filters#binding-filters)

## Public Api
