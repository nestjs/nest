# Interface: ValueProvider\<T\>

Defined in: packages/common/interfaces/modules/provider.interface.ts:79

Interface defining a *Value* type provider.

For example:
```typescript
const connectionProvider = {
  provide: 'CONNECTION',
  useValue: connection,
};
```

## See

[Value providers](https://docs.nestjs.com/fundamentals/custom-providers#value-providers-usevalue)

## Public Api

## Type Parameters

### T

`T` = `any`

## Properties

### inject?

> `optional` **inject**: `undefined`

Defined in: packages/common/interfaces/modules/provider.interface.ts:93

This option is only available on factory providers!

#### See

[Use factory](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory)

***

### provide

> **provide**: [`InjectionToken`](../type-aliases/InjectionToken.md)

Defined in: packages/common/interfaces/modules/provider.interface.ts:83

Injection token

***

### useValue

> **useValue**: `T`

Defined in: packages/common/interfaces/modules/provider.interface.ts:87

Instance of a provider to be injected.
