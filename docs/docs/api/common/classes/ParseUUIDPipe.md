# Class: ParseUUIDPipe

Defined in: packages/common/pipes/parse-uuid.pipe.ts:48

Defines the built-in ParseUUID Pipe

## See

[Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)

## Public Api

## Implements

- [`PipeTransform`](../interfaces/PipeTransform.md)\<`string`\>

## Constructors

### Constructor

> **new ParseUUIDPipe**(`options?`): `ParseUUIDPipe`

Defined in: packages/common/pipes/parse-uuid.pipe.ts:59

#### Parameters

##### options?

[`ParseUUIDPipeOptions`](../interfaces/ParseUUIDPipeOptions.md)

#### Returns

`ParseUUIDPipe`

## Properties

### exceptionFactory()

> `protected` **exceptionFactory**: (`errors`) => `any`

Defined in: packages/common/pipes/parse-uuid.pipe.ts:57

#### Parameters

##### errors

`string`

#### Returns

`any`

***

### options?

> `protected` `readonly` `optional` **options**: [`ParseUUIDPipeOptions`](../interfaces/ParseUUIDPipeOptions.md)

Defined in: packages/common/pipes/parse-uuid.pipe.ts:59

***

### uuidRegExps

> `protected` `static` **uuidRegExps**: `object`

Defined in: packages/common/pipes/parse-uuid.pipe.ts:49

#### 3

> **3**: `RegExp`

#### 4

> **4**: `RegExp`

#### 5

> **5**: `RegExp`

#### 7

> **7**: `RegExp`

#### all

> **all**: `RegExp`

## Methods

### isUUID()

> `protected` **isUUID**(`str`, `version`): `any`

Defined in: packages/common/pipes/parse-uuid.pipe.ts:87

#### Parameters

##### str

`unknown`

##### version

`string` = `'all'`

#### Returns

`any`

***

### transform()

> **transform**(`value`, `metadata`): `Promise`\<`string`\>

Defined in: packages/common/pipes/parse-uuid.pipe.ts:73

Method to implement a custom pipe.  Called with two parameters

#### Parameters

##### value

`string`

argument before it is received by route handler method

##### metadata

[`ArgumentMetadata`](../interfaces/ArgumentMetadata.md)

contains metadata about the value

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`PipeTransform`](../interfaces/PipeTransform.md).[`transform`](../interfaces/PipeTransform.md#transform)
