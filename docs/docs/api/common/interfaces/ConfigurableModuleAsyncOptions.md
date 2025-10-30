# Interface: ConfigurableModuleAsyncOptions\<ModuleOptions, FactoryClassMethodKey\>

Defined in: packages/common/module-utils/interfaces/configurable-module-async-options.interface.ts:29

Interface that represents the module async options object
Factory method name varies depending on the "FactoryClassMethodKey" type argument.

## Public Api

## Extends

- `Pick`\<[`ModuleMetadata`](ModuleMetadata.md), `"imports"`\>

## Type Parameters

### ModuleOptions

`ModuleOptions`

### FactoryClassMethodKey

`FactoryClassMethodKey` *extends* `string` = *typeof* `DEFAULT_FACTORY_CLASS_METHOD_KEY`

## Properties

### imports?

> `optional` **imports**: ([`DynamicModule`](DynamicModule.md) \| [`Type`](Type.md)\<`any`\> \| `Promise`\<[`DynamicModule`](DynamicModule.md)\> \| [`ForwardReference`](ForwardReference.md)\<`any`\>)[]

Defined in: packages/common/interfaces/modules/module-metadata.interface.ts:19

Optional list of imported modules that export the providers which are
required in this module.

#### Inherited from

[`DynamicModule`](DynamicModule.md).[`imports`](DynamicModule.md#imports)

***

### inject?

> `optional` **inject**: ([`InjectionToken`](../type-aliases/InjectionToken.md) \| [`OptionalFactoryDependency`](../type-aliases/OptionalFactoryDependency.md))[]

Defined in: packages/common/module-utils/interfaces/configurable-module-async-options.interface.ts:56

Dependencies that a Factory may inject.

***

### provideInjectionTokensFrom?

> `optional` **provideInjectionTokensFrom**: [`Provider`](../type-aliases/Provider.md)[]

Defined in: packages/common/module-utils/interfaces/configurable-module-async-options.interface.ts:62

List of parent module's providers that will be filtered to only provide necessary
providers for the 'inject' array
useful to pass options to nested async modules

***

### useClass?

> `optional` **useClass**: [`Type`](Type.md)\<[`ConfigurableModuleOptionsFactory`](../type-aliases/ConfigurableModuleOptionsFactory.md)\<`ModuleOptions`, `FactoryClassMethodKey`\>\>

Defined in: packages/common/module-utils/interfaces/configurable-module-async-options.interface.ts:45

Injection token resolving to a class that will be instantiated as a provider.
The class must implement the corresponding interface.

***

### useExisting?

> `optional` **useExisting**: [`Type`](Type.md)\<[`ConfigurableModuleOptionsFactory`](../type-aliases/ConfigurableModuleOptionsFactory.md)\<`ModuleOptions`, `FactoryClassMethodKey`\>\>

Defined in: packages/common/module-utils/interfaces/configurable-module-async-options.interface.ts:38

Injection token resolving to an existing provider. The provider must implement
the corresponding interface.

***

### useFactory()?

> `optional` **useFactory**: (...`args`) => `ModuleOptions` \| `Promise`\<`ModuleOptions`\>

Defined in: packages/common/module-utils/interfaces/configurable-module-async-options.interface.ts:52

Function returning options (or a Promise resolving to options) to configure the
module.

#### Parameters

##### args

...`any`[]

#### Returns

`ModuleOptions` \| `Promise`\<`ModuleOptions`\>
