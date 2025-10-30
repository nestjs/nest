# Class: ParseDatePipe

Defined in: packages/common/pipes/parse-date.pipe.ts:34

Interface describing implementation of a pipe.

## See

[Pipes](https://docs.nestjs.com/pipes)

## Public Api

## Implements

- [`PipeTransform`](../interfaces/PipeTransform.md)\<`string` \| `number` \| `undefined` \| `null`\>

## Constructors

### Constructor

> **new ParseDatePipe**(`options`): `ParseDatePipe`

Defined in: packages/common/pipes/parse-date.pipe.ts:39

#### Parameters

##### options

[`ParseDatePipeOptions`](../interfaces/ParseDatePipeOptions.md) = `{}`

#### Returns

`ParseDatePipe`

## Properties

### exceptionFactory()

> `protected` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/parse-date.pipe.ts:37

#### Parameters

##### error

`string`

#### Returns

`any`

## Methods

### transform()

> **transform**(`value`): `Date` \| `null` \| `undefined`

Defined in: packages/common/pipes/parse-date.pipe.ts:55

Method that accesses and performs optional transformation on argument for
in-flight requests.

#### Parameters

##### value

currently processed route argument

`string` | `number` | `null` | `undefined`

#### Returns

`Date` \| `null` \| `undefined`

#### Implementation of

[`PipeTransform`](../interfaces/PipeTransform.md).[`transform`](../interfaces/PipeTransform.md#transform)
