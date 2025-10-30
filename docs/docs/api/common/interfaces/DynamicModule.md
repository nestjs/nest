# Interface: DynamicModule

Defined in: packages/common/interfaces/modules/dynamic-module.interface.ts:11

Interface defining a Dynamic Module.

## See

[Dynamic Modules](https://docs.nestjs.com/modules#dynamic-modules)

## Public Api

## Extends

- [`ModuleMetadata`](ModuleMetadata.md)

## Properties

### controllers?

> `optional` **controllers**: [`Type`](Type.md)\<`any`\>[]

Defined in: packages/common/interfaces/modules/module-metadata.interface.ts:26

Optional list of controllers defined in this module which have to be
instantiated.

#### Inherited from

[`ModuleMetadata`](ModuleMetadata.md).[`controllers`](ModuleMetadata.md#controllers)

***

### exports?

> `optional` **exports**: (`string` \| `symbol` \| `Function` \| `DynamicModule` \| [`Provider`](../type-aliases/Provider.md) \| [`Abstract`](Abstract.md)\<`any`\> \| [`ForwardReference`](ForwardReference.md)\<`any`\>)[]

Defined in: packages/common/interfaces/modules/module-metadata.interface.ts:36

Optional list of the subset of providers that are provided by this module
and should be available in other modules which import this module.

#### Inherited from

[`ModuleMetadata`](ModuleMetadata.md).[`exports`](ModuleMetadata.md#exports)

***

### global?

> `optional` **global**: `boolean`

Defined in: packages/common/interfaces/modules/dynamic-module.interface.ts:26

When "true", makes a module global-scoped.

Once imported into any module, a global-scoped module will be visible
in all modules. Thereafter, modules that wish to inject a service exported
from a global module do not need to import the provider module.

#### Default

```ts
false
```

***

### imports?

> `optional` **imports**: (`DynamicModule` \| [`Type`](Type.md)\<`any`\> \| `Promise`\<`DynamicModule`\> \| [`ForwardReference`](ForwardReference.md)\<`any`\>)[]

Defined in: packages/common/interfaces/modules/module-metadata.interface.ts:19

Optional list of imported modules that export the providers which are
required in this module.

#### Inherited from

[`ModuleMetadata`](ModuleMetadata.md).[`imports`](ModuleMetadata.md#imports)

***

### module

> **module**: [`Type`](Type.md)\<`any`\>

Defined in: packages/common/interfaces/modules/dynamic-module.interface.ts:15

A module reference

***

### providers?

> `optional` **providers**: [`Provider`](../type-aliases/Provider.md)[]

Defined in: packages/common/interfaces/modules/module-metadata.interface.ts:31

Optional list of providers that will be instantiated by the Nest injector
and that may be shared at least across this module.

#### Inherited from

[`ModuleMetadata`](ModuleMetadata.md).[`providers`](ModuleMetadata.md#providers)
