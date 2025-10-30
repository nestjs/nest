# Class: ParseEnumPipe\<T\>

Defined in: packages/common/pipes/parse-enum.pipe.ts:40

Defines the built-in ParseEnum Pipe

## See

[Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)

## Public Api

## Type Parameters

### T

`T` = `any`

## Implements

- [`PipeTransform`](../interfaces/PipeTransform.md)\<`T`\>

## Constructors

### Constructor

> **new ParseEnumPipe**\<`T`\>(`enumType`, `options?`): `ParseEnumPipe`\<`T`\>

Defined in: packages/common/pipes/parse-enum.pipe.ts:42

#### Parameters

##### enumType

`T`

##### options?

[`ParseEnumPipeOptions`](../interfaces/ParseEnumPipeOptions.md)

#### Returns

`ParseEnumPipe`\<`T`\>

## Properties

### enumType

> `protected` `readonly` **enumType**: `T`

Defined in: packages/common/pipes/parse-enum.pipe.ts:43

***

### exceptionFactory()

> `protected` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/parse-enum.pipe.ts:41

#### Parameters

##### error

`string`

#### Returns

`any`

***

### options?

> `protected` `readonly` `optional` **options**: [`ParseEnumPipeOptions`](../interfaces/ParseEnumPipeOptions.md)

Defined in: packages/common/pipes/parse-enum.pipe.ts:44

## Methods

### isEnum()

> `protected` **isEnum**(`value`): `boolean`

Defined in: packages/common/pipes/parse-enum.pipe.ts:79

#### Parameters

##### value

`T`

#### Returns

`boolean`

***

### transform()

> **transform**(`value`, `metadata`): `Promise`\<`T`\>

Defined in: packages/common/pipes/parse-enum.pipe.ts:67

Method that accesses and performs optional transformation on argument for
in-flight requests.

#### Parameters

##### value

`T`

currently processed route argument

##### metadata

[`ArgumentMetadata`](../interfaces/ArgumentMetadata.md)

contains metadata about the currently processed route argument

#### Returns

`Promise`\<`T`\>

#### Implementation of

[`PipeTransform`](../interfaces/PipeTransform.md).[`transform`](../interfaces/PipeTransform.md#transform)
