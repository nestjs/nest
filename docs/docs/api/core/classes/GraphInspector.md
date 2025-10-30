# Class: GraphInspector

Defined in: packages/core/inspector/graph-inspector.ts:13

## Constructors

### Constructor

> **new GraphInspector**(`container`): `GraphInspector`

Defined in: packages/core/inspector/graph-inspector.ts:18

#### Parameters

##### container

[`NestContainer`](NestContainer.md)

#### Returns

`GraphInspector`

## Methods

### insertAttachedEnhancer()

> **insertAttachedEnhancer**(`wrapper`): `void`

Defined in: packages/core/inspector/graph-inspector.ts:93

#### Parameters

##### wrapper

`InstanceWrapper`

#### Returns

`void`

***

### insertClassNode()

> **insertClassNode**(`moduleRef`, `wrapper`, `type`): `void`

Defined in: packages/core/inspector/graph-inspector.ts:111

#### Parameters

##### moduleRef

`Module`

##### wrapper

`InstanceWrapper`

##### type

`"provider"` | `"controller"` | `"middleware"` | `"injectable"`

#### Returns

`void`

***

### insertEnhancerMetadataCache()

> **insertEnhancerMetadataCache**(`entry`): `void`

Defined in: packages/core/inspector/graph-inspector.ts:82

#### Parameters

##### entry

`EnhancerMetadataCacheEntry`

#### Returns

`void`

***

### insertEntrypointDefinition()

> **insertEntrypointDefinition**\<`T`\>(`definition`, `parentId`): `void`

Defined in: packages/core/inspector/graph-inspector.ts:100

#### Type Parameters

##### T

`T`

#### Parameters

##### definition

`Entrypoint`\<`T`\>

##### parentId

`string`

#### Returns

`void`

***

### insertOrphanedEnhancer()

> **insertOrphanedEnhancer**(`entry`): `void`

Defined in: packages/core/inspector/graph-inspector.ts:86

#### Parameters

##### entry

`OrphanedEnhancerDefinition`

#### Returns

`void`

***

### inspectInstanceWrapper()

> **inspectInstanceWrapper**\<`T`\>(`source`, `moduleRef`): `void`

Defined in: packages/core/inspector/graph-inspector.ts:61

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### source

`InstanceWrapper`\<`T`\>

##### moduleRef

`Module`

#### Returns

`void`

***

### inspectModules()

> **inspectModules**(`modules`): `void`

Defined in: packages/core/inspector/graph-inspector.ts:22

#### Parameters

##### modules

`Map`\<`string`, `Module`\> = `...`

#### Returns

`void`

***

### registerPartial()

> **registerPartial**(`error`): `void`

Defined in: packages/core/inspector/graph-inspector.ts:38

#### Parameters

##### error

`unknown`

#### Returns

`void`
