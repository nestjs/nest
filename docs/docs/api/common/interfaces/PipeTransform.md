# Interface: PipeTransform\<T, R\>

Defined in: packages/common/interfaces/features/pipe-transform.interface.ts:37

Interface describing implementation of a pipe.

## See

[Pipes](https://docs.nestjs.com/pipes)

## Public Api

## Type Parameters

### T

`T` = `any`

### R

`R` = `any`

## Methods

### transform()

> **transform**(`value`, `metadata`): `R`

Defined in: packages/common/interfaces/features/pipe-transform.interface.ts:44

Method to implement a custom pipe.  Called with two parameters

#### Parameters

##### value

`T`

argument before it is received by route handler method

##### metadata

[`ArgumentMetadata`](ArgumentMetadata.md)

contains metadata about the value

#### Returns

`R`
