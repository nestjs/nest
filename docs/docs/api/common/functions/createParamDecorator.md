# Function: createParamDecorator()

> **createParamDecorator**\<`FactoryData`, `FactoryOutput`\>(`factory`, `enhancers`): (...`dataOrPipes`) => `ParameterDecorator`

Defined in: packages/common/decorators/http/create-route-param-metadata.decorator.ts:19

Defines HTTP route param decorator

## Type Parameters

### FactoryData

`FactoryData` = `any`

### FactoryOutput

`FactoryOutput` = `any`

## Parameters

### factory

`CustomParamFactory`\<`FactoryData`, `FactoryOutput`\>

### enhancers

`ParameterDecorator`[] = `[]`

## Returns

> (...`dataOrPipes`): `ParameterDecorator`

### Parameters

#### dataOrPipes

...([`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\> \| [`Type`](../interfaces/Type.md)\<[`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>\> \| `FactoryData`)[]

### Returns

`ParameterDecorator`

## Public Api
