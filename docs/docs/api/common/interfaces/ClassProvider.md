# Interface: ClassProvider\<T\>

Defined in: packages/common/interfaces/modules/provider.interface.ts:36

Interface defining a *Class* type provider.

For example:
```typescript
const configServiceProvider = {
provide: ConfigService,
useClass:
  process.env.NODE_ENV === 'development'
    ? DevelopmentConfigService
    : ProductionConfigService,
};
```

## See

 - [Class providers](https://docs.nestjs.com/fundamentals/custom-providers#class-providers-useclass)
 - [Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)

## Public Api

## Type Parameters

### T

`T` = `any`

## Properties

### durable?

> `optional` **durable**: `boolean`

Defined in: packages/common/interfaces/modules/provider.interface.ts:61

Flags provider as durable. This flag can be used in combination with custom context id
factory strategy to construct lazy DI subtrees.

This flag can be used only in conjunction with scope = Scope.REQUEST.

***

### inject?

> `optional` **inject**: `undefined`

Defined in: packages/common/interfaces/modules/provider.interface.ts:54

This option is only available on factory providers!

#### See

[Use factory](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory)

***

### provide

> **provide**: [`InjectionToken`](../type-aliases/InjectionToken.md)

Defined in: packages/common/interfaces/modules/provider.interface.ts:40

Injection token

***

### scope?

> `optional` **scope**: [`Scope`](../enumerations/Scope.md)

Defined in: packages/common/interfaces/modules/provider.interface.ts:48

Optional enum defining lifetime of the provider that is injected.

***

### useClass

> **useClass**: [`Type`](Type.md)\<`T`\>

Defined in: packages/common/interfaces/modules/provider.interface.ts:44

Type (class name) of provider (instance to be injected).
