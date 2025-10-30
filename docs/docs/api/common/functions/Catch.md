# Function: Catch()

> **Catch**(...`exceptions`): `ClassDecorator`

Defined in: packages/common/decorators/core/catch.decorator.ts:21

Decorator that marks a class as a Nest exception filter. An exception filter
handles exceptions thrown by or not handled by your application code.

The decorated class must implement the `ExceptionFilter` interface.

## Parameters

### exceptions

...([`Type`](../interfaces/Type.md)\<`any`\> \| [`Abstract`](../interfaces/Abstract.md)\<`any`\>)[]

one or more exception *types* specifying
the exceptions to be caught and handled by this filter.

## Returns

`ClassDecorator`

## See

[Exception Filters](https://docs.nestjs.com/exception-filters)

## Usage Notes

Exception filters are applied using the `@UseFilters()` decorator, or (globally)
with `app.useGlobalFilters()`.

## Public Api
