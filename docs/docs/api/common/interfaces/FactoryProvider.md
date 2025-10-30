# Interface: FactoryProvider\<T\>

Defined in: packages/common/interfaces/modules/provider.interface.ts:116

Interface defining a *Factory* type provider.

For example:
```typescript
const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};
```

## See

 - [Factory providers](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory)
 - [Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)

## Public Api

## Type Parameters

### T

`T` = `any`

## Properties

### durable?

> `optional` **durable**: `boolean`

Defined in: packages/common/interfaces/modules/provider.interface.ts:139

Flags provider as durable. This flag can be used in combination with custom context id
factory strategy to construct lazy DI subtrees.

This flag can be used only in conjunction with scope = Scope.REQUEST.

***

### inject?

> `optional` **inject**: ([`InjectionToken`](../type-aliases/InjectionToken.md) \| [`OptionalFactoryDependency`](../type-aliases/OptionalFactoryDependency.md))[]

Defined in: packages/common/interfaces/modules/provider.interface.ts:128

Optional list of providers to be injected into the context of the Factory function.

***

### provide

> **provide**: [`InjectionToken`](../type-aliases/InjectionToken.md)

Defined in: packages/common/interfaces/modules/provider.interface.ts:120

Injection token

***

### scope?

> `optional` **scope**: [`Scope`](../enumerations/Scope.md)

Defined in: packages/common/interfaces/modules/provider.interface.ts:132

Optional enum defining lifetime of the provider that is returned by the Factory function.

***

### useFactory()

> **useFactory**: (...`args`) => `T` \| `Promise`\<`T`\>

Defined in: packages/common/interfaces/modules/provider.interface.ts:124

Factory function that returns an instance of the provider to be injected.

#### Parameters

##### args

...`any`[]

#### Returns

`T` \| `Promise`\<`T`\>
