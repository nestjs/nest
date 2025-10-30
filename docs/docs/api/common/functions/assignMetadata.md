# Function: assignMetadata()

> **assignMetadata**\<`TParamtype`, `TArgs`\>(`args`, `paramtype`, `index`, `data?`, ...`pipes?`): `TArgs` & `object`

Defined in: packages/common/decorators/http/route-params.decorator.ts:30

## Type Parameters

### TParamtype

`TParamtype` = `any`

### TArgs

`TArgs` = `any`

## Parameters

### args

`TArgs`

### paramtype

`TParamtype`

### index

`number`

### data?

[`ParamData`](../type-aliases/ParamData.md)

### pipes?

...([`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\> \| [`Type`](../interfaces/Type.md)\<[`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>\>)[]

## Returns

`TArgs` & `object`
