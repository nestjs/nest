# Class: ParseIntPipe

Defined in: packages/common/pipes/parse-int.pipe.ts:44

Defines the built-in ParseInt Pipe

## See

[Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)

## Public Api

## Implements

- [`PipeTransform`](../interfaces/PipeTransform.md)\<`string`\>

## Constructors

### Constructor

> **new ParseIntPipe**(`options?`): `ParseIntPipe`

Defined in: packages/common/pipes/parse-int.pipe.ts:47

#### Parameters

##### options?

[`ParseIntPipeOptions`](../interfaces/ParseIntPipeOptions.md)

#### Returns

`ParseIntPipe`

## Properties

### exceptionFactory()

> `protected` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/parse-int.pipe.ts:45

#### Parameters

##### error

`string`

#### Returns

`any`

***

### options?

> `protected` `readonly` `optional` **options**: [`ParseIntPipeOptions`](../interfaces/ParseIntPipeOptions.md)

Defined in: packages/common/pipes/parse-int.pipe.ts:47

## Methods

### isNumeric()

> `protected` **isNumeric**(`value`): `boolean`

Defined in: packages/common/pipes/parse-int.pipe.ts:80

#### Parameters

##### value

`string`

currently processed route argument

#### Returns

`boolean`

`true` if `value` is a valid integer number

***

### transform()

> **transform**(`value`, `metadata`): `Promise`\<`number`\>

Defined in: packages/common/pipes/parse-int.pipe.ts:64

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
