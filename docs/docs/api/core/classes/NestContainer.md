# Class: NestContainer

Defined in: packages/core/injector/container.ts:31

## Constructors

### Constructor

> **new NestContainer**(`_applicationConfig`, `_contextOptions`): `NestContainer`

Defined in: packages/core/injector/container.ts:43

#### Parameters

##### \_applicationConfig

[`ApplicationConfig`](ApplicationConfig.md) | `undefined`

##### \_contextOptions

`NestApplicationContextOptions` | `undefined`

#### Returns

`NestContainer`

## Accessors

### applicationConfig

#### Get Signature

> **get** **applicationConfig**(): [`ApplicationConfig`](ApplicationConfig.md) \| `undefined`

Defined in: packages/core/injector/container.ts:66

##### Returns

[`ApplicationConfig`](ApplicationConfig.md) \| `undefined`

***

### contextOptions

#### Get Signature

> **get** **contextOptions**(): `NestApplicationContextOptions` \| `undefined`

Defined in: packages/core/injector/container.ts:70

##### Returns

`NestApplicationContextOptions` \| `undefined`

***

### serializedGraph

#### Get Signature

> **get** **serializedGraph**(): [`SerializedGraph`](SerializedGraph.md)

Defined in: packages/core/injector/container.ts:62

##### Returns

[`SerializedGraph`](SerializedGraph.md)

## Methods

### addController()

> **addController**(`controller`, `token`): `void`

Defined in: packages/core/injector/container.ts:296

#### Parameters

##### controller

[`Type`](../../common/interfaces/Type.md)\<`any`\>

##### token

`string`

#### Returns

`void`

***

### addDynamicMetadata()

> **addDynamicMetadata**(`token`, `dynamicModuleMetadata`, `scope`): `Promise`\<`void`\>

Defined in: packages/core/injector/container.ts:187

#### Parameters

##### token

`string`

##### dynamicModuleMetadata

`Partial`\<[`DynamicModule`](../../common/interfaces/DynamicModule.md)\>

##### scope

[`Type`](../../common/interfaces/Type.md)\<`any`\>[]

#### Returns

`Promise`\<`void`\>

***

### addDynamicModules()

> **addDynamicModules**(`modules`, `scope`): `Promise`\<`void`\>

Defined in: packages/core/injector/container.ts:201

#### Parameters

##### modules

`any`[]

##### scope

[`Type`](../../common/interfaces/Type.md)\<`any`\>[]

#### Returns

`Promise`\<`void`\>

***

### addExportedProviderOrModule()

> **addExportedProviderOrModule**(`toExport`, `token`): `void`

Defined in: packages/core/injector/container.ts:285

#### Parameters

##### toExport

[`DynamicModule`](../../common/interfaces/DynamicModule.md) | [`Type`](../../common/interfaces/Type.md)\<`any`\>

##### token

`string`

#### Returns

`void`

***

### addGlobalModule()

> **addGlobalModule**(`module`): `void`

Defined in: packages/core/injector/container.ts:218

#### Parameters

##### module

`Module`

#### Returns

`void`

***

### addImport()

> **addImport**(`relatedModule`, `token`): `Promise`\<`void`\>

Defined in: packages/core/injector/container.ts:238

#### Parameters

##### relatedModule

[`DynamicModule`](../../common/interfaces/DynamicModule.md) | [`Type`](../../common/interfaces/Type.md)\<`any`\>

##### token

`string`

#### Returns

`Promise`\<`void`\>

***

### addInjectable()

> **addInjectable**(`injectable`, `token`, `enhancerSubtype`, `host?`): `string` \| `symbol` \| `Function` \| `InstanceWrapper`\<`unknown`\>

Defined in: packages/core/injector/container.ts:272

#### Parameters

##### injectable

[`Provider`](../../common/type-aliases/Provider.md)

##### token

`string`

##### enhancerSubtype

`EnhancerSubtype`

##### host?

[`Type`](../../common/interfaces/Type.md)\<`unknown`\>

#### Returns

`string` \| `symbol` \| `Function` \| `InstanceWrapper`\<`unknown`\>

***

### addModule()

> **addModule**(`metatype`, `scope`): `Promise`\<\{ `inserted`: `boolean`; `moduleRef`: `Module`; \} \| `undefined`\>

Defined in: packages/core/injector/container.ts:92

#### Parameters

##### metatype

`ModuleMetatype`

##### scope

`ModuleScope`

#### Returns

`Promise`\<\{ `inserted`: `boolean`; `moduleRef`: `Module`; \} \| `undefined`\>

***

### addProvider()

> **addProvider**(`provider`, `token`, `enhancerSubtype?`): `string` \| `symbol` \| `Function`

Defined in: packages/core/injector/container.ts:252

#### Parameters

##### provider

[`Provider`](../../common/type-aliases/Provider.md)

##### token

`string`

##### enhancerSubtype?

`EnhancerSubtype`

#### Returns

`string` \| `symbol` \| `Function`

***

### bindGlobalModuleToModule()

> **bindGlobalModuleToModule**(`target`, `globalModule`): `void`

Defined in: packages/core/injector/container.ts:328

#### Parameters

##### target

`Module`

##### globalModule

`Module`

#### Returns

`void`

***

### bindGlobalScope()

> **bindGlobalScope**(): `void`

Defined in: packages/core/injector/container.ts:318

#### Returns

`void`

***

### bindGlobalsToImports()

> **bindGlobalsToImports**(`moduleRef`): `void`

Defined in: packages/core/injector/container.ts:322

#### Parameters

##### moduleRef

`Module`

#### Returns

`void`

***

### clear()

> **clear**(): `void`

Defined in: packages/core/injector/container.ts:310

#### Returns

`void`

***

### getDynamicMetadataByToken()

#### Call Signature

> **getDynamicMetadataByToken**(`token`): `Partial`\<[`DynamicModule`](../../common/interfaces/DynamicModule.md)\>

Defined in: packages/core/injector/container.ts:335

##### Parameters

###### token

`string`

##### Returns

`Partial`\<[`DynamicModule`](../../common/interfaces/DynamicModule.md)\>

#### Call Signature

> **getDynamicMetadataByToken**\<`K`\>(`token`, `metadataKey`): [`DynamicModule`](../../common/interfaces/DynamicModule.md)\[`K`\]

Defined in: packages/core/injector/container.ts:336

##### Type Parameters

###### K

`K` *extends* `"imports"` \| `"controllers"` \| `"providers"` \| `"exports"`

##### Parameters

###### token

`string`

###### metadataKey

`K`

##### Returns

[`DynamicModule`](../../common/interfaces/DynamicModule.md)\[`K`\]

***

### getHttpAdapterHostRef()

> **getHttpAdapterHostRef**(): [`HttpAdapterHost`](HttpAdapterHost.md)\<[`AbstractHttpAdapter`](AbstractHttpAdapter.md)\<`any`, `any`, `any`\>\>

Defined in: packages/core/injector/container.ts:88

#### Returns

[`HttpAdapterHost`](HttpAdapterHost.md)\<[`AbstractHttpAdapter`](AbstractHttpAdapter.md)\<`any`, `any`, `any`\>\>

***

### getHttpAdapterRef()

> **getHttpAdapterRef**(): [`AbstractHttpAdapter`](AbstractHttpAdapter.md)\<`any`, `any`, `any`\>

Defined in: packages/core/injector/container.ts:84

#### Returns

[`AbstractHttpAdapter`](AbstractHttpAdapter.md)\<`any`, `any`, `any`\>

***

### getInternalCoreModuleRef()

> **getInternalCoreModuleRef**(): `Module` \| `undefined`

Defined in: packages/core/injector/container.ts:234

#### Returns

`Module` \| `undefined`

***

### getModuleByKey()

> **getModuleByKey**(`moduleKey`): `Module` \| `undefined`

Defined in: packages/core/injector/container.ts:230

#### Parameters

##### moduleKey

`string`

#### Returns

`Module` \| `undefined`

***

### getModuleCompiler()

> **getModuleCompiler**(): `ModuleCompiler`

Defined in: packages/core/injector/container.ts:226

#### Returns

`ModuleCompiler`

***

### getModules()

> **getModules**(): [`ModulesContainer`](ModulesContainer.md)

Defined in: packages/core/injector/container.ts:222

#### Returns

[`ModulesContainer`](ModulesContainer.md)

***

### getModuleTokenFactory()

> **getModuleTokenFactory**(): `ModuleOpaqueKeyFactory`

Defined in: packages/core/injector/container.ts:352

#### Returns

`ModuleOpaqueKeyFactory`

***

### isGlobalModule()

> **isGlobalModule**(`metatype`, `dynamicMetadata?`): `boolean`

Defined in: packages/core/injector/container.ts:208

#### Parameters

##### metatype

[`Type`](../../common/interfaces/Type.md)\<`any`\>

##### dynamicMetadata?

`Partial`\<[`DynamicModule`](../../common/interfaces/DynamicModule.md)\>

#### Returns

`boolean`

***

### registerCoreModuleRef()

> **registerCoreModuleRef**(`moduleRef`): `void`

Defined in: packages/core/injector/container.ts:347

#### Parameters

##### moduleRef

`Module`

#### Returns

`void`

***

### registerRequestProvider()

> **registerRequestProvider**\<`T`\>(`request`, `contextId`): `void`

Defined in: packages/core/injector/container.ts:356

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### request

`T`

##### contextId

[`ContextId`](../interfaces/ContextId.md)

#### Returns

`void`

***

### replace()

> **replace**(`toReplace`, `options`): `void`

Defined in: packages/core/injector/container.ts:314

#### Parameters

##### toReplace

`any`

##### options

###### scope

`any`[] \| `null`

#### Returns

`void`

***

### replaceModule()

> **replaceModule**(`metatypeToReplace`, `newMetatype`, `scope`): `Promise`\<\{ `inserted`: `boolean`; `moduleRef`: `Module`; \} \| `undefined`\>

Defined in: packages/core/injector/container.ts:129

#### Parameters

##### metatypeToReplace

`ModuleMetatype`

##### newMetatype

`ModuleMetatype`

##### scope

`ModuleScope`

#### Returns

`Promise`\<\{ `inserted`: `boolean`; `moduleRef`: `Module`; \} \| `undefined`\>

***

### setHttpAdapter()

> **setHttpAdapter**(`httpAdapter`): `void`

Defined in: packages/core/injector/container.ts:74

#### Parameters

##### httpAdapter

`any`

#### Returns

`void`
