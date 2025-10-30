# Class: ModulesContainer

Defined in: packages/core/injector/modules-container.ts:5

## Extends

- `Map`\<`string`, `Module`\>

## Constructors

### Constructor

> **new ModulesContainer**(`entries?`): `ModulesContainer`

Defined in: docs/node\_modules/typescript/lib/lib.es2015.collection.d.ts:50

#### Parameters

##### entries?

readonly readonly \[`string`, `Module`\][] | `null`

#### Returns

`ModulesContainer`

#### Inherited from

`Map<string, Module>.constructor`

### Constructor

> **new ModulesContainer**(`iterable?`): `ModulesContainer`

Defined in: docs/node\_modules/typescript/lib/lib.es2015.collection.d.ts:49

#### Parameters

##### iterable?

`Iterable`\<readonly \[`string`, `Module`\], `any`, `any`\> | `null`

#### Returns

`ModulesContainer`

#### Inherited from

`Map<string, Module>.constructor`

## Accessors

### applicationId

#### Get Signature

> **get** **applicationId**(): `string`

Defined in: packages/core/injector/modules-container.ts:12

Unique identifier of the application instance.

##### Returns

`string`

## Methods

### addRpcTarget()

> **addRpcTarget**\<`T`\>(`target`): `void`

Defined in: packages/core/injector/modules-container.ts:38

Adds an RPC target to the registry.

#### Type Parameters

##### T

`T`

#### Parameters

##### target

`T`

The RPC target to add.

#### Returns

`void`

***

### getById()

> **getById**(`id`): `Module` \| `undefined`

Defined in: packages/core/injector/modules-container.ts:21

Retrieves a module by its identifier.

#### Parameters

##### id

`string`

The identifier of the module to retrieve.

#### Returns

`Module` \| `undefined`

The module instance if found, otherwise undefined.

***

### getRpcTargetRegistry()

> **getRpcTargetRegistry**\<`T`\>(): `Observable`\<`T`\>

Defined in: packages/core/injector/modules-container.ts:30

Returns the RPC target registry as an observable.
This registry contains all RPC targets registered in the application.

#### Type Parameters

##### T

`T`

#### Returns

`Observable`\<`T`\>

An observable that emits the RPC target registry.
