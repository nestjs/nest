# Class: ParseArrayPipe

Defined in: packages/common/pipes/parse-array.pipe.ts:55

Defines the built-in ParseArray Pipe

## See

[Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)

## Public Api

## Implements

- [`PipeTransform`](../interfaces/PipeTransform.md)

## Constructors

### Constructor

> **new ParseArrayPipe**(`options`): `ParseArrayPipe`

Defined in: packages/common/pipes/parse-array.pipe.ts:59

#### Parameters

##### options

[`ParseArrayOptions`](../interfaces/ParseArrayOptions.md) = `{}`

#### Returns

`ParseArrayPipe`

## Properties

### exceptionFactory()

> `protected` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/parse-array.pipe.ts:57

#### Parameters

##### error

`string`

#### Returns

`any`

***

### options

> `protected` `readonly` **options**: [`ParseArrayOptions`](../interfaces/ParseArrayOptions.md) = `{}`

Defined in: packages/common/pipes/parse-array.pipe.ts:59

***

### validationPipe

> `protected` `readonly` **validationPipe**: [`ValidationPipe`](ValidationPipe.md)

Defined in: packages/common/pipes/parse-array.pipe.ts:56

## Methods

### isExpectedTypePrimitive()

> `protected` **isExpectedTypePrimitive**(): `boolean`

Defined in: packages/common/pipes/parse-array.pipe.ts:157

#### Returns

`boolean`

***

### transform()

> **transform**(`value`, `metadata`): `Promise`\<`any`\>

Defined in: packages/common/pipes/parse-array.pipe.ts:80

Method that accesses and performs optional transformation on argument for
in-flight requests.

#### Parameters

##### value

`any`

currently processed route argument

##### metadata

[`ArgumentMetadata`](../interfaces/ArgumentMetadata.md)

contains metadata about the currently processed route argument

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`PipeTransform`](../interfaces/PipeTransform.md).[`transform`](../interfaces/PipeTransform.md#transform)

***

### validatePrimitive()

> `protected` **validatePrimitive**(`originalValue`, `index?`): `any`

Defined in: packages/common/pipes/parse-array.pipe.ts:161

#### Parameters

##### originalValue

`any`

##### index?

`number`

#### Returns

`any`
