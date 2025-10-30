# Interface: ExistingProvider\<T\>

Defined in: packages/common/interfaces/modules/provider.interface.ts:157

Interface defining an *Existing* (aliased) type provider.

For example:
```typescript
const loggerAliasProvider = {
  provide: 'AliasedLoggerService',
  useExisting: LoggerService
};
```

## See

[Alias providers](https://docs.nestjs.com/fundamentals/custom-providers#alias-providers-useexisting)

## Public Api

## Type Parameters

### T

`T` = `any`

## Properties

### provide

> **provide**: [`InjectionToken`](../type-aliases/InjectionToken.md)

Defined in: packages/common/interfaces/modules/provider.interface.ts:161

Injection token

***

### useExisting

> **useExisting**: `any`

Defined in: packages/common/interfaces/modules/provider.interface.ts:165

Provider to be aliased by the Injection token.
