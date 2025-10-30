# Class: SerializedGraph

Defined in: packages/core/inspector/serialized-graph.ts:26

## Constructors

### Constructor

> **new SerializedGraph**(): `SerializedGraph`

#### Returns

`SerializedGraph`

## Accessors

### metadata

#### Set Signature

> **set** **metadata**(`metadata`): `void`

Defined in: packages/core/inspector/serialized-graph.ts:56

##### Parameters

###### metadata

`SerializedGraphMetadata`

##### Returns

`void`

***

### status

#### Set Signature

> **set** **status**(`status`): `void`

Defined in: packages/core/inspector/serialized-graph.ts:52

##### Parameters

###### status

[`SerializedGraphStatus`](../type-aliases/SerializedGraphStatus.md)

##### Returns

`void`

## Methods

### getNodeById()

> **getNodeById**(`id`): `Node` \| `undefined`

Defined in: packages/core/inspector/serialized-graph.ts:121

#### Parameters

##### id

`string`

#### Returns

`Node` \| `undefined`

***

### insertAttachedEnhancer()

> **insertAttachedEnhancer**(`nodeId`): `void`

Defined in: packages/core/inspector/serialized-graph.ts:115

#### Parameters

##### nodeId

`string`

#### Returns

`void`

***

### insertEdge()

> **insertEdge**(`edgeDefinition`): `object`

Defined in: packages/core/inspector/serialized-graph.ts:77

#### Parameters

##### edgeDefinition

`WithOptionalId`\<`Edge`\>

#### Returns

`object`

##### id

> **id**: `string`

##### metadata

> **metadata**: `ModuleToModuleEdgeMetadata` \| `ClassToClassEdgeMetadata`

##### source

> **source**: `string`

##### target

> **target**: `string`

***

### insertEntrypoint()

> **insertEntrypoint**\<`T`\>(`definition`, `parentId`): `void`

Defined in: packages/core/inspector/serialized-graph.ts:102

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

### insertNode()

> **insertNode**(`nodeDefinition`): `Node` \| `undefined`

Defined in: packages/core/inspector/serialized-graph.ts:60

#### Parameters

##### nodeDefinition

`Node`

#### Returns

`Node` \| `undefined`

***

### insertOrphanedEnhancer()

> **insertOrphanedEnhancer**(`entry`): `void`

Defined in: packages/core/inspector/serialized-graph.ts:111

#### Parameters

##### entry

`OrphanedEnhancerDefinition`

#### Returns

`void`

***

### toJSON()

> **toJSON**(): `SerializedGraphJson`

Defined in: packages/core/inspector/serialized-graph.ts:125

#### Returns

`SerializedGraphJson`

***

### toString()

> **toString**(): `string`

Defined in: packages/core/inspector/serialized-graph.ts:142

#### Returns

`string`
