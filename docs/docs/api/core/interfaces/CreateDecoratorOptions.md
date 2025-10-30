# Interface: CreateDecoratorOptions\<TParam, TTransformed\>

Defined in: packages/core/services/reflector.service.ts:8

## Public Api

## Type Parameters

### TParam

`TParam` = `any`

### TTransformed

`TTransformed` = `TParam`

## Properties

### key?

> `optional` **key**: `string`

Defined in: packages/core/services/reflector.service.ts:13

The key for the metadata.

#### Default

```ts
uid(21)
```

***

### transform()?

> `optional` **transform**: (`value`) => `TTransformed`

Defined in: packages/core/services/reflector.service.ts:19

The transform function to apply to the metadata value.

#### Parameters

##### value

`TParam`

#### Returns

`TTransformed`

#### Default

```ts
value => value
```
