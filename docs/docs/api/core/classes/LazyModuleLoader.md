# Class: LazyModuleLoader

Defined in: packages/core/injector/lazy-module-loader/lazy-module-loader.ts:12

## Constructors

### Constructor

> **new LazyModuleLoader**(`dependenciesScanner`, `instanceLoader`, `moduleCompiler`, `modulesContainer`, `moduleOverrides?`): `LazyModuleLoader`

Defined in: packages/core/injector/lazy-module-loader/lazy-module-loader.ts:13

#### Parameters

##### dependenciesScanner

`DependenciesScanner`

##### instanceLoader

`InstanceLoader`

##### moduleCompiler

`ModuleCompiler`

##### modulesContainer

[`ModulesContainer`](ModulesContainer.md)

##### moduleOverrides?

`ModuleOverride`[]

#### Returns

`LazyModuleLoader`

## Methods

### load()

> **load**(`loaderFn`, `loadOpts?`): `Promise`\<[`ModuleRef`](ModuleRef.md)\>

Defined in: packages/core/injector/lazy-module-loader/lazy-module-loader.ts:21

#### Parameters

##### loaderFn

() => [`DynamicModule`](../../common/interfaces/DynamicModule.md) \| [`Type`](../../common/interfaces/Type.md)\<`unknown`\> \| `Promise`\<[`DynamicModule`](../../common/interfaces/DynamicModule.md) \| [`Type`](../../common/interfaces/Type.md)\<`unknown`\>\>

##### loadOpts?

`LazyModuleLoaderLoadOptions`

#### Returns

`Promise`\<[`ModuleRef`](ModuleRef.md)\>
