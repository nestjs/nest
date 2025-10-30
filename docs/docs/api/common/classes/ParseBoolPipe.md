# Class: ParseBoolPipe

Defined in: packages/common/pipes/parse-bool.pipe.ts:44

Defines the built-in ParseBool Pipe

## See

[Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)

## Public Api

## Implements

- [`PipeTransform`](../interfaces/PipeTransform.md)\<`string` \| `boolean`, `Promise`\<`boolean`\>\>

## Constructors

### Constructor

> **new ParseBoolPipe**(`options?`): `ParseBoolPipe`

Defined in: packages/common/pipes/parse-bool.pipe.ts:49

#### Parameters

##### options?

[`ParseBoolPipeOptions`](../interfaces/ParseBoolPipeOptions.md)

#### Returns

`ParseBoolPipe`

## Properties

### exceptionFactory()

> `protected` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/parse-bool.pipe.ts:47

#### Parameters

##### error

`string`

#### Returns

`any`

***

### options?

> `protected` `readonly` `optional` **options**: [`ParseBoolPipeOptions`](../interfaces/ParseBoolPipeOptions.md)

Defined in: packages/common/pipes/parse-bool.pipe.ts:49

## Methods

### isFalse()

> `protected` **isFalse**(`value`): `boolean`

Defined in: packages/common/pipes/parse-bool.pipe.ts:97

#### Parameters

##### value

currently processed route argument

`string` | `boolean`

#### Returns

`boolean`

`true` if `value` is said 'false', ie., if it is equal to the boolean
`false` or the string `"false"`

***

### isTrue()

> `protected` **isTrue**(`value`): `boolean`

Defined in: packages/common/pipes/parse-bool.pipe.ts:88

#### Parameters

##### value

currently processed route argument

`string` | `boolean`

#### Returns

`boolean`

`true` if `value` is said 'true', ie., if it is equal to the boolean
`true` or the string `"true"`

***

### transform()

> **transform**(`value`, `metadata`): `Promise`\<`boolean`\>

Defined in: packages/common/pipes/parse-bool.pipe.ts:65

Method that accesses and performs optional transformation on argument for
in-flight requests.

#### Parameters

##### value

currently processed route argument

`string` | `boolean`

##### metadata

[`ArgumentMetadata`](../interfaces/ArgumentMetadata.md)

contains metadata about the currently processed route argument

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`PipeTransform`](../interfaces/PipeTransform.md).[`transform`](../interfaces/PipeTransform.md#transform)
