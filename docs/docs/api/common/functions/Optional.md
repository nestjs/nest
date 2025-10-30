# Function: Optional()

> **Optional**(): `PropertyDecorator` & `ParameterDecorator`

Defined in: packages/common/decorators/core/optional.decorator.ts:20

Parameter decorator for an injected dependency marking the
dependency as optional.

For example:
```typescript
constructor(@Optional() @Inject('HTTP_OPTIONS')private readonly httpClient: T) {}
```

## Returns

`PropertyDecorator` & `ParameterDecorator`

## See

[Optional providers](https://docs.nestjs.com/providers#optional-providers)

## Public Api
