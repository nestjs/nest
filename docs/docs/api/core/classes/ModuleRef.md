# Abstract Class: ModuleRef

Defined in: packages/core/injector/module-ref.ts:25

## Extends

- `AbstractInstanceResolver`

## Constructors

### Constructor

> **new ModuleRef**(`container`): `ModuleRef`

Defined in: packages/core/injector/module-ref.ts:36

#### Parameters

##### container

[`NestContainer`](NestContainer.md)

#### Returns

`ModuleRef`

#### Overrides

`AbstractInstanceResolver.constructor`

## Properties

### container

> `protected` `readonly` **container**: [`NestContainer`](NestContainer.md)

Defined in: packages/core/injector/module-ref.ts:36

***

### injector

> `protected` `readonly` **injector**: `Injector`

Defined in: packages/core/injector/module-ref.ts:26

#### Overrides

`AbstractInstanceResolver.injector`

## Accessors

### instanceLinksHost

#### Get Signature

> **get** `protected` **instanceLinksHost**(): `InstanceLinksHost`

Defined in: packages/core/injector/module-ref.ts:29

##### Returns

`InstanceLinksHost`

#### Overrides

`AbstractInstanceResolver.instanceLinksHost`

## Methods

### create()

> `abstract` **create**\<`T`\>(`type`, `contextId?`): `Promise`\<`T`\>

Defined in: packages/core/injector/module-ref.ts:137

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### type

[`Type`](../../common/interfaces/Type.md)\<`T`\>

##### contextId?

[`ContextId`](../interfaces/ContextId.md)

#### Returns

`Promise`\<`T`\>

***

### find()

> `protected` **find**\<`TInput`, `TResult`\>(`typeOrToken`, `options`): `TResult` \| `TResult`[]

Defined in: packages/core/injector/abstract-instance-resolver.ts:21

#### Type Parameters

##### TInput

`TInput` = `any`

##### TResult

`TResult` = `TInput`

#### Parameters

##### typeOrToken

`string` | `symbol` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\> | [`Abstract`](../../common/interfaces/Abstract.md)\<`TInput`\>

##### options

###### each?

`boolean`

###### moduleId?

`string`

#### Returns

`TResult` \| `TResult`[]

#### Inherited from

`AbstractInstanceResolver.find`

***

### get()

#### Call Signature

> `abstract` **get**\<`TInput`, `TResult`\>(`typeOrToken`): `TResult`

Defined in: packages/core/injector/module-ref.ts:50

Retrieves an instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

##### Returns

`TResult`

##### Overrides

`AbstractInstanceResolver.get`

#### Call Signature

> `abstract` **get**\<`TInput`, `TResult`\>(`typeOrToken`, `options`): `TResult`

Defined in: packages/core/injector/module-ref.ts:57

Retrieves an instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

###### options

###### each?

`false`

This indicates that only the first instance registered will be returned.

###### strict?

`boolean`

If enabled, lookup will only be performed in the host module.

**Default**

```ts
true
```

##### Returns

`TResult`

##### Overrides

`AbstractInstanceResolver.get`

#### Call Signature

> `abstract` **get**\<`TInput`, `TResult`\>(`typeOrToken`, `options`): `TResult`[]

Defined in: packages/core/injector/module-ref.ts:73

Retrieves a list of instances of either injectables or controllers, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

###### options

###### each

`true`

This indicates that a list of instances will be returned.

###### strict?

`boolean`

If enabled, lookup will only be performed in the host module.

**Default**

```ts
true
```

##### Returns

`TResult`[]

##### Overrides

`AbstractInstanceResolver.get`

#### Call Signature

> `abstract` **get**\<`TInput`, `TResult`\>(`typeOrToken`, `options?`): `TResult` \| `TResult`[]

Defined in: packages/core/injector/module-ref.ts:89

Retrieves an instance (or a list of instances) of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

###### options?

[`ModuleRefGetOrResolveOpts`](../interfaces/ModuleRefGetOrResolveOpts.md)

##### Returns

`TResult` \| `TResult`[]

##### Overrides

`AbstractInstanceResolver.get`

***

### instantiateClass()

> `protected` **instantiateClass**\<`T`\>(`type`, `moduleRef`, `contextId?`): `Promise`\<`T`\>

Defined in: packages/core/injector/module-ref.ts:160

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### type

[`Type`](../../common/interfaces/Type.md)\<`T`\>

##### moduleRef

`Module`

##### contextId?

[`ContextId`](../interfaces/ContextId.md)

#### Returns

`Promise`\<`T`\>

***

### introspect()

> **introspect**\<`T`\>(`token`): [`IntrospectionResult`](../../common/interfaces/IntrospectionResult.md)

Defined in: packages/core/injector/module-ref.ts:142

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### token

`string` | `symbol` | [`Type`](../../common/interfaces/Type.md)\<`T`\>

#### Returns

[`IntrospectionResult`](../../common/interfaces/IntrospectionResult.md)

***

### registerRequestByContextId()

> **registerRequestByContextId**\<`T`\>(`request`, `contextId`): `void`

Defined in: packages/core/injector/module-ref.ts:156

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

### resolve()

#### Call Signature

> `abstract` **resolve**\<`TInput`, `TResult`\>(`typeOrToken`): `Promise`\<`TResult`\>

Defined in: packages/core/injector/module-ref.ts:98

Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

##### Returns

`Promise`\<`TResult`\>

#### Call Signature

> `abstract` **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`): `Promise`\<`TResult`\>

Defined in: packages/core/injector/module-ref.ts:105

Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

###### contextId?

###### id

`number`

##### Returns

`Promise`\<`TResult`\>

#### Call Signature

> `abstract` **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`, `options?`): `Promise`\<`TResult`\>

Defined in: packages/core/injector/module-ref.ts:113

Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

###### contextId?

###### id

`number`

###### options?

###### each?

`false`

###### strict?

`boolean`

##### Returns

`Promise`\<`TResult`\>

#### Call Signature

> `abstract` **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`, `options?`): `Promise`\<`TResult`[]\>

Defined in: packages/core/injector/module-ref.ts:122

Resolves transient or request-scoped instances of either injectables or controllers, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

###### contextId?

###### id

`number`

###### options?

###### each

`true`

###### strict?

`boolean`

##### Returns

`Promise`\<`TResult`[]\>

#### Call Signature

> `abstract` **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`, `options?`): `Promise`\<`TResult` \| `TResult`[]\>

Defined in: packages/core/injector/module-ref.ts:131

Resolves transient or request-scoped instance (or a list of instances) of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

###### contextId?

###### id

`number`

###### options?

[`ModuleRefGetOrResolveOpts`](../interfaces/ModuleRefGetOrResolveOpts.md)

##### Returns

`Promise`\<`TResult` \| `TResult`[]\>

***

### resolvePerContext()

> `protected` **resolvePerContext**\<`TInput`, `TResult`\>(`typeOrToken`, `contextModule`, `contextId`, `options?`): `Promise`\<`TResult` \| `TResult`[]\>

Defined in: packages/core/injector/abstract-instance-resolver.ts:44

#### Type Parameters

##### TInput

`TInput` = `any`

##### TResult

`TResult` = `TInput`

#### Parameters

##### typeOrToken

`string` | `symbol` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\> | [`Abstract`](../../common/interfaces/Abstract.md)\<`TInput`\>

##### contextModule

`Module`

##### contextId

[`ContextId`](../interfaces/ContextId.md)

##### options?

`GetOrResolveOptions`

#### Returns

`Promise`\<`TResult` \| `TResult`[]\>

#### Inherited from

`AbstractInstanceResolver.resolvePerContext`
