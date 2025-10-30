# Function: UseInterceptors()

> **UseInterceptors**(...`interceptors`): `MethodDecorator` & `ClassDecorator`

Defined in: packages/common/decorators/core/use-interceptors.decorator.ts:28

Decorator that binds interceptors to the scope of the controller or method,
depending on its context.

When `@UseInterceptors` is used at the controller level, the interceptor will
be applied to every handler (method) in the controller.

When `@UseInterceptors` is used at the individual handler level, the interceptor
will apply only to that specific method.

## Parameters

### interceptors

...(`Function` \| [`NestInterceptor`](../interfaces/NestInterceptor.md)\<`any`, `any`\>)[]

a single interceptor instance or class, or a list of
interceptor instances or classes.

## Returns

`MethodDecorator` & `ClassDecorator`

## See

[Interceptors](https://docs.nestjs.com/interceptors)

## Usage Notes

Interceptors can also be set up globally for all controllers and routes
using `app.useGlobalInterceptors()`.  [See here for details](https://docs.nestjs.com/interceptors#binding-interceptors)

## Public Api
