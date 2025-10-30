# Class: ParseFloatPipe

Defined in: packages/common/pipes/parse-float.pipe.ts:40

Defines the built-in ParseFloat Pipe

## See

[Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)

## Public Api

## Implements

- [`PipeTransform`](../interfaces/PipeTransform.md)\<`string`\>

## Constructors

### Constructor

> **new ParseFloatPipe**(`options?`): `ParseFloatPipe`

Defined in: packages/common/pipes/parse-float.pipe.ts:43

#### Parameters

##### options?

[`ParseFloatPipeOptions`](../interfaces/ParseFloatPipeOptions.md)

#### Returns

`ParseFloatPipe`

## Properties

### exceptionFactory()

> `protected` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/parse-float.pipe.ts:41

#### Parameters

##### error

`string`

#### Returns

`any`

***

### options?

> `protected` `readonly` `optional` **options**: [`ParseFloatPipeOptions`](../interfaces/ParseFloatPipeOptions.md)

Defined in: packages/common/pipes/parse-float.pipe.ts:43

## Methods

### isNumeric()

> `protected` **isNumeric**(`value`): `boolean`

Defined in: packages/common/pipes/parse-float.pipe.ts:76

#### Parameters

##### value

`string`

currently processed route argument

#### Returns

`boolean`

`true` if `value` is a valid float number

***

### transform()

> **transform**(`value`, `metadata`): `Promise`\<`number`\>

Defined in: packages/common/pipes/parse-float.pipe.ts:60

Method that accesses and performs optional transformation on argument for
in-flight requests.

#### Parameters

##### value

`string`

currently processed route argument

##### metadata

[`ArgumentMetadata`](../interfaces/ArgumentMetadata.md)

contains metadata about the currently processed route argument

#### Returns

`Promise`\<`number`\>

#### Implementation of

[`PipeTransform`](../interfaces/PipeTransform.md).[`transform`](../interfaces/PipeTransform.md#transform)
