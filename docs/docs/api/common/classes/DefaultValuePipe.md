# Class: DefaultValuePipe\<T, R\>

Defined in: packages/common/pipes/default-value.pipe.ts:16

Defines the built-in DefaultValue Pipe

## See

[Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)

## Public Api

## Type Parameters

### T

`T` = `any`

### R

`R` = `any`

## Implements

- [`PipeTransform`](../interfaces/PipeTransform.md)\<`T`, `T` \| `R`\>

## Constructors

### Constructor

> **new DefaultValuePipe**\<`T`, `R`\>(`defaultValue`): `DefaultValuePipe`\<`T`, `R`\>

Defined in: packages/common/pipes/default-value.pipe.ts:19

#### Parameters

##### defaultValue

`R`

#### Returns

`DefaultValuePipe`\<`T`, `R`\>

## Properties

### defaultValue

> `protected` `readonly` **defaultValue**: `R`

Defined in: packages/common/pipes/default-value.pipe.ts:19

## Methods

### transform()

> **transform**(`value?`, `_metadata?`): `T` \| `R`

Defined in: packages/common/pipes/default-value.pipe.ts:21

Method to implement a custom pipe.  Called with two parameters

#### Parameters

##### value?

`T`

argument before it is received by route handler method

##### \_metadata?

[`ArgumentMetadata`](../interfaces/ArgumentMetadata.md)

#### Returns

`T` \| `R`

#### Implementation of

[`PipeTransform`](../interfaces/PipeTransform.md).[`transform`](../interfaces/PipeTransform.md#transform)
