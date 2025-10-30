# Class: ExternalContextCreator

Defined in: packages/core/helpers/external-context-creator.ts:38

## Constructors

### Constructor

> **new ExternalContextCreator**(`guardsContextCreator`, `guardsConsumer`, `interceptorsContextCreator`, `interceptorsConsumer`, `modulesContainer`, `pipesContextCreator`, `pipesConsumer`, `filtersContextCreator`): `ExternalContextCreator`

Defined in: packages/core/helpers/external-context-creator.ts:45

#### Parameters

##### guardsContextCreator

`GuardsContextCreator`

##### guardsConsumer

`GuardsConsumer`

##### interceptorsContextCreator

`InterceptorsContextCreator`

##### interceptorsConsumer

`InterceptorsConsumer`

##### modulesContainer

[`ModulesContainer`](ModulesContainer.md)

##### pipesContextCreator

`PipesContextCreator`

##### pipesConsumer

`PipesConsumer`

##### filtersContextCreator

`ExternalExceptionFilterContext`

#### Returns

`ExternalContextCreator`

## Methods

### create()

> **create**\<`TParamsMetadata`, `TContext`\>(`instance`, `callback`, `methodName`, `metadataKey?`, `paramsFactory?`, `contextId?`, `inquirerId?`, `options?`, `contextType?`): (...`args`) => `Promise`\<`any`\>

Defined in: packages/core/helpers/external-context-creator.ts:91

#### Type Parameters

##### TParamsMetadata

`TParamsMetadata` *extends* `ParamsMetadata` = `ParamsMetadata`

##### TContext

`TContext` *extends* `string` = [`ContextType`](../../common/type-aliases/ContextType.md)

#### Parameters

##### instance

`object`

##### callback

(...`args`) => `unknown`

##### methodName

`string`

##### metadataKey?

`string`

##### paramsFactory?

[`ParamsFactory`](../interfaces/ParamsFactory.md)

##### contextId?

[`ContextId`](../interfaces/ContextId.md) = `STATIC_CONTEXT`

##### inquirerId?

`string`

##### options?

[`ExternalContextOptions`](../interfaces/ExternalContextOptions.md) = `...`

##### contextType?

`TContext` = `...`

#### Returns

> (...`args`): `Promise`\<`any`\>

##### Parameters

###### args

...`any`[]

##### Returns

`Promise`\<`any`\>

***

### createGuardsFn()

> **createGuardsFn**\<`TContext`\>(`guards`, `instance`, `callback`, `contextType?`): `Function` \| `null`

Defined in: packages/core/helpers/external-context-creator.ts:338

#### Type Parameters

##### TContext

`TContext` *extends* `string` = [`ContextType`](../../common/type-aliases/ContextType.md)

#### Parameters

##### guards

`any`[]

##### instance

`object`

##### callback

(...`args`) => `any`

##### contextType?

`TContext`

#### Returns

`Function` \| `null`

***

### createPipesFn()

> **createPipesFn**(`pipes`, `paramsOptions`): (`args`, ...`params`) => `Promise`\<`void`\> \| `null`

Defined in: packages/core/helpers/external-context-creator.ts:292

#### Parameters

##### pipes

[`PipeTransform`](../../common/interfaces/PipeTransform.md)\<`any`, `any`\>[]

##### paramsOptions

`ParamProperties`\<`any`, `any`\> & `object`[]

#### Returns

(`args`, ...`params`) => `Promise`\<`void`\> \| `null`

***

### exchangeKeysForValues()

> **exchangeKeysForValues**\<`TMetadata`\>(`keys`, `metadata`, `moduleContext`, `paramsFactory`, `contextId`, `inquirerId?`, `contextFactory?`): `ParamProperties`\<`any`, `any`\>[]

Defined in: packages/core/helpers/external-context-creator.ts:255

#### Type Parameters

##### TMetadata

`TMetadata` = `any`

#### Parameters

##### keys

`string`[]

##### metadata

`TMetadata`

##### moduleContext

`string`

##### paramsFactory

[`ParamsFactory`](../interfaces/ParamsFactory.md)

##### contextId

[`ContextId`](../interfaces/ContextId.md) = `STATIC_CONTEXT`

##### inquirerId?

`string`

##### contextFactory?

(`args`) => `ExecutionContextHost`

#### Returns

`ParamProperties`\<`any`, `any`\>[]

***

### getContextModuleKey()

> **getContextModuleKey**(`moduleCtor`): `string`

Defined in: packages/core/helpers/external-context-creator.ts:241

#### Parameters

##### moduleCtor

`Function` | `undefined`

#### Returns

`string`

***

### getMetadata()

> **getMetadata**\<`TMetadata`, `TContext`\>(`instance`, `methodName`, `metadataKey?`, `paramsFactory?`, `contextType?`): `ExternalHandlerMetadata`

Defined in: packages/core/helpers/external-context-creator.ts:187

#### Type Parameters

##### TMetadata

`TMetadata`

##### TContext

`TContext` *extends* `string` = [`ContextType`](../../common/type-aliases/ContextType.md)

#### Parameters

##### instance

`object`

##### methodName

`string`

##### metadataKey?

`string`

##### paramsFactory?

[`ParamsFactory`](../interfaces/ParamsFactory.md)

##### contextType?

`TContext`

#### Returns

`ExternalHandlerMetadata`

***

### getParamValue()

> **getParamValue**\<`T`\>(`value`, `__namedParameters`, `pipes`): `Promise`\<`any`\>

Defined in: packages/core/helpers/external-context-creator.ts:321

#### Type Parameters

##### T

`T`

#### Parameters

##### value

`T`

##### \_\_namedParameters

###### data

`any`

###### metatype

`any`

###### type

`any`

##### pipes

[`PipeTransform`](../../common/interfaces/PipeTransform.md)\<`any`, `any`\>[]

#### Returns

`Promise`\<`any`\>

***

### registerRequestProvider()

> **registerRequestProvider**\<`T`\>(`request`, `contextId`): `void`

Defined in: packages/core/helpers/external-context-creator.ts:359

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

### transformToResult()

> **transformToResult**(`resultOrDeferred`): `Promise`\<`any`\>

Defined in: packages/core/helpers/external-context-creator.ts:331

#### Parameters

##### resultOrDeferred

`any`

#### Returns

`Promise`\<`any`\>

***

### fromContainer()

> `static` **fromContainer**(`container`): `ExternalContextCreator`

Defined in: packages/core/helpers/external-context-creator.ts:56

#### Parameters

##### container

[`NestContainer`](NestContainer.md)

#### Returns

`ExternalContextCreator`
