# Interface: ModuleMetadata

Defined in: packages/common/interfaces/modules/module-metadata.interface.ts:14

Interface defining the property object that describes the module.

## See

[Modules](https://docs.nestjs.com/modules)

## Public Api

## Extended by

- [`DynamicModule`](DynamicModule.md)

## Properties

### controllers?

> `optional` **controllers**: [`Type`](Type.md)\<`any`\>[]

Defined in: packages/common/interfaces/modules/module-metadata.interface.ts:26

Optional list of controllers defined in this module which have to be
instantiated.

***

### exports?

> `optional` **exports**: (`string` \| `symbol` \| `Function` \| [`DynamicModule`](DynamicModule.md) \| [`Provider`](../type-aliases/Provider.md) \| [`Abstract`](Abstract.md)\<`any`\> \| [`ForwardReference`](ForwardReference.md)\<`any`\>)[]

Defined in: packages/common/interfaces/modules/module-metadata.interface.ts:36

Optional list of the subset of providers that are provided by this module
and should be available in other modules which import this module.

***

### imports?

> `optional` **imports**: ([`DynamicModule`](DynamicModule.md) \| [`Type`](Type.md)\<`any`\> \| `Promise`\<[`DynamicModule`](DynamicModule.md)\> \| [`ForwardReference`](ForwardReference.md)\<`any`\>)[]

Defined in: packages/common/interfaces/modules/module-metadata.interface.ts:19

Optional list of imported modules that export the providers which are
required in this module.

***

### providers?

> `optional` **providers**: [`Provider`](../type-aliases/Provider.md)[]

Defined in: packages/common/interfaces/modules/module-metadata.interface.ts:31

Optional list of providers that will be instantiated by the Nest injector
and that may be shared at least across this module.
