# Class: Reflector

Defined in: packages/core/services/reflector.service.ts:44

Helper class providing Nest reflection capabilities.

## See

[Reflection](https://docs.nestjs.com/guards#putting-it-all-together)

## Public Api

## Constructors

### Constructor

> **new Reflector**(): `Reflector`

#### Returns

`Reflector`

## Methods

### get()

Retrieve metadata for a specified key or decorator for a specified target.

#### Example

```ts
`const roles = this.reflector.get<string[]>('roles', context.getHandler());`
```

#### Param

lookup key or decorator for metadata to retrieve

#### Param

context (decorated object) to retrieve metadata from

#### Call Signature

> **get**\<`T`\>(`decorator`, `target`): `T` *extends* [`ReflectableDecorator`](../type-aliases/ReflectableDecorator.md)\<`any`, `R`\> ? `R` : `unknown`

Defined in: packages/core/services/reflector.service.ts:84

Retrieve metadata for a reflectable decorator for a specified target.

##### Type Parameters

###### T

`T` *extends* [`ReflectableDecorator`](../type-aliases/ReflectableDecorator.md)\<`any`, `any`\>

##### Parameters

###### decorator

`T`

reflectable decorator created through `Reflector.createDecorator`

###### target

context (decorated object) to retrieve metadata from

`Function` | [`Type`](../../common/interfaces/Type.md)\<`any`\>

##### Returns

`T` *extends* [`ReflectableDecorator`](../type-aliases/ReflectableDecorator.md)\<`any`, `R`\> ? `R` : `unknown`

##### Example

```ts
`const roles = this.reflector.get(Roles, context.getHandler());`
```

#### Call Signature

> **get**\<`TResult`, `TKey`\>(`metadataKey`, `target`): `TResult`

Defined in: packages/core/services/reflector.service.ts:98

Retrieve metadata for a specified key for a specified target.

##### Type Parameters

###### TResult

`TResult` = `any`

###### TKey

`TKey` = `any`

##### Parameters

###### metadataKey

`TKey`

lookup key for metadata to retrieve

###### target

context (decorated object) to retrieve metadata from

`Function` | [`Type`](../../common/interfaces/Type.md)\<`any`\>

##### Returns

`TResult`

##### Example

```ts
`const roles = this.reflector.get<string[]>('roles', context.getHandler());`
```

***

### getAll()

Retrieve metadata for a specified key or decorator for a specified set of targets.

#### Param

lookup key or decorator for metadata to retrieve

#### Param

context (decorated objects) to retrieve metadata from

#### Call Signature

> **getAll**\<`TParam`, `TTransformed`\>(`decorator`, `targets`): `TTransformed` *extends* `any`[] ? `TTransformed`\<`TTransformed`\> : `TTransformed`[]

Defined in: packages/core/services/reflector.service.ts:130

Retrieve metadata for a specified decorator for a specified set of targets.

##### Type Parameters

###### TParam

`TParam` = `any`

###### TTransformed

`TTransformed` = `TParam`

##### Parameters

###### decorator

[`ReflectableDecorator`](../type-aliases/ReflectableDecorator.md)\<`TParam`, `TTransformed`\>

lookup decorator for metadata to retrieve

###### targets

(`Function` \| [`Type`](../../common/interfaces/Type.md)\<`any`\>)[]

context (decorated objects) to retrieve metadata from

##### Returns

`TTransformed` *extends* `any`[] ? `TTransformed`\<`TTransformed`\> : `TTransformed`[]

#### Call Signature

> **getAll**\<`TResult`, `TKey`\>(`metadataKey`, `targets`): `TResult`

Defined in: packages/core/services/reflector.service.ts:141

Retrieve metadata for a specified key for a specified set of targets.

##### Type Parameters

###### TResult

`TResult` *extends* `any`[] = `any`[]

###### TKey

`TKey` = `any`

##### Parameters

###### metadataKey

`TKey`

lookup key for metadata to retrieve

###### targets

(`Function` \| [`Type`](../../common/interfaces/Type.md)\<`any`\>)[]

context (decorated objects) to retrieve metadata from

##### Returns

`TResult`

***

### getAllAndMerge()

Retrieve metadata for a specified key or decorator for a specified set of targets and merge results.

#### Param

lookup key for metadata to retrieve

#### Param

context (decorated objects) to retrieve metadata from

#### Call Signature

> **getAllAndMerge**\<`TParam`, `TTransformed`\>(`decorator`, `targets`): `TTransformed` *extends* `any`[] ? `TTransformed`\<`TTransformed`\> : `TTransformed` *extends* `object` ? `TTransformed`\<`TTransformed`\> : `TTransformed`[]

Defined in: packages/core/services/reflector.service.ts:168

Retrieve metadata for a specified decorator for a specified set of targets and merge results.

##### Type Parameters

###### TParam

`TParam` = `any`

###### TTransformed

`TTransformed` = `TParam`

##### Parameters

###### decorator

[`ReflectableDecorator`](../type-aliases/ReflectableDecorator.md)\<`TParam`, `TTransformed`\>

lookup decorator for metadata to retrieve

###### targets

(`Function` \| [`Type`](../../common/interfaces/Type.md)\<`any`\>)[]

context (decorated objects) to retrieve metadata from

##### Returns

`TTransformed` *extends* `any`[] ? `TTransformed`\<`TTransformed`\> : `TTransformed` *extends* `object` ? `TTransformed`\<`TTransformed`\> : `TTransformed`[]

#### Call Signature

> **getAllAndMerge**\<`TResult`, `TKey`\>(`metadataKey`, `targets`): `TResult`

Defined in: packages/core/services/reflector.service.ts:183

Retrieve metadata for a specified key for a specified set of targets and merge results.

##### Type Parameters

###### TResult

`TResult` *extends* `object` \| `any`[] = `any`[]

###### TKey

`TKey` = `any`

##### Parameters

###### metadataKey

`TKey`

lookup key for metadata to retrieve

###### targets

(`Function` \| [`Type`](../../common/interfaces/Type.md)\<`any`\>)[]

context (decorated objects) to retrieve metadata from

##### Returns

`TResult`

***

### getAllAndOverride()

Retrieve metadata for a specified key or decorator for a specified set of targets and return a first not undefined value.

#### Param

lookup key or metadata for metadata to retrieve

#### Param

context (decorated objects) to retrieve metadata from

#### Call Signature

> **getAllAndOverride**\<`TParam`, `TTransformed`\>(`decorator`, `targets`): `TTransformed`

Defined in: packages/core/services/reflector.service.ts:234

Retrieve metadata for a specified decorator for a specified set of targets and return a first not undefined value.

##### Type Parameters

###### TParam

`TParam` = `any`

###### TTransformed

`TTransformed` = `TParam`

##### Parameters

###### decorator

[`ReflectableDecorator`](../type-aliases/ReflectableDecorator.md)\<`TParam`, `TTransformed`\>

lookup decorator for metadata to retrieve

###### targets

(`Function` \| [`Type`](../../common/interfaces/Type.md)\<`any`\>)[]

context (decorated objects) to retrieve metadata from

##### Returns

`TTransformed`

#### Call Signature

> **getAllAndOverride**\<`TResult`, `TKey`\>(`metadataKey`, `targets`): `TResult`

Defined in: packages/core/services/reflector.service.ts:245

Retrieve metadata for a specified key for a specified set of targets and return a first not undefined value.

##### Type Parameters

###### TResult

`TResult` = `any`

###### TKey

`TKey` = `any`

##### Parameters

###### metadataKey

`TKey`

lookup key for metadata to retrieve

###### targets

(`Function` \| [`Type`](../../common/interfaces/Type.md)\<`any`\>)[]

context (decorated objects) to retrieve metadata from

##### Returns

`TResult`

***

### createDecorator()

#### Call Signature

> `static` **createDecorator**\<`TParam`\>(`options?`): [`ReflectableDecorator`](../type-aliases/ReflectableDecorator.md)\<`TParam`\>

Defined in: packages/core/services/reflector.service.ts:51

Creates a decorator that can be used to decorate classes and methods with metadata.
Can be used as a strongly-typed alternative to `@SetMetadata`.

##### Type Parameters

###### TParam

`TParam`

##### Parameters

###### options?

[`CreateDecoratorOptions`](../interfaces/CreateDecoratorOptions.md)\<`TParam`, `TParam`\>

Decorator options.

##### Returns

[`ReflectableDecorator`](../type-aliases/ReflectableDecorator.md)\<`TParam`\>

A decorator function.

#### Call Signature

> `static` **createDecorator**\<`TParam`, `TTransformed`\>(`options`): [`ReflectableDecorator`](../type-aliases/ReflectableDecorator.md)\<`TParam`, `TTransformed`\>

Defined in: packages/core/services/reflector.service.ts:54

Creates a decorator that can be used to decorate classes and methods with metadata.
Can be used as a strongly-typed alternative to `@SetMetadata`.

##### Type Parameters

###### TParam

`TParam`

###### TTransformed

`TTransformed`

##### Parameters

###### options

`CreateDecoratorWithTransformOptions`\<`TParam`, `TTransformed`\>

Decorator options.

##### Returns

[`ReflectableDecorator`](../type-aliases/ReflectableDecorator.md)\<`TParam`, `TTransformed`\>

A decorator function.
