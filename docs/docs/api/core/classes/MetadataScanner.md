# Class: MetadataScanner

Defined in: packages/core/metadata-scanner.ts:8

## Constructors

### Constructor

> **new MetadataScanner**(): `MetadataScanner`

#### Returns

`MetadataScanner`

## Methods

### ~~getAllFilteredMethodNames()~~

> **getAllFilteredMethodNames**(`prototype`): `IterableIterator`\<`string`\>

Defined in: packages/core/metadata-scanner.ts:72

#### Parameters

##### prototype

`object`

#### Returns

`IterableIterator`\<`string`\>

#### Deprecated

#### See

 - [getAllMethodNames](#getallmethodnames)
 - getAllMethodNames

***

### getAllMethodNames()

> **getAllMethodNames**(`prototype`): `string`[]

Defined in: packages/core/metadata-scanner.ts:78

#### Parameters

##### prototype

`object` | `null`

#### Returns

`string`[]

***

### ~~scanFromPrototype()~~

> **scanFromPrototype**\<`T`, `R`\>(`instance`, `prototype`, `callback`): `R`[]

Defined in: packages/core/metadata-scanner.ts:16

#### Type Parameters

##### T

`T` *extends* `unknown`

##### R

`R` = `any`

#### Parameters

##### instance

`T`

##### prototype

`object` | `null`

##### callback

(`name`) => `R`

#### Returns

`R`[]

#### Deprecated

#### See

 - [getAllMethodNames](#getallmethodnames)
 - getAllMethodNames
