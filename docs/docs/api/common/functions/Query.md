# Function: Query()

Route handler parameter decorator. Extracts the `query`
property from the `req` object and populates the decorated
parameter with the value of `query`. May also apply pipes to the bound
query parameter.

For example:
```typescript
async find(@Query('user') user: string)
```

## Param

name of single property to extract from the `query` object

## Param

one or more pipes to apply to the bound query parameter

## See

[Request object](https://docs.nestjs.com/controllers#request-object)

## Public Api

## Call Signature

> **Query**(): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:346

Route handler parameter decorator. Extracts the `query`
property from the `req` object and populates the decorated
parameter with the value of `query`. May also apply pipes to the bound
query parameter.

For example:
```typescript
async find(@Query('user') user: string)
```

### Returns

`ParameterDecorator`

### See

[Request object](https://docs.nestjs.com/controllers#request-object)

### Public Api

## Call Signature

> **Query**(...`pipes`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:365

Route handler parameter decorator. Extracts the `query`
property from the `req` object and populates the decorated
parameter with the value of `query`. May also apply pipes to the bound
query parameter.

For example:
```typescript
async find(@Query('user') user: string)
```

### Parameters

#### pipes

...([`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\> \| [`Type`](../interfaces/Type.md)\<[`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>\>)[]

one or more pipes to apply to the bound query parameter

### Returns

`ParameterDecorator`

### See

[Request object](https://docs.nestjs.com/controllers#request-object)

### Public Api

## Call Signature

> **Query**(`property`, ...`pipes`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:386

Route handler parameter decorator. Extracts the `query`
property from the `req` object and populates the decorated
parameter with the value of `query`. May also apply pipes to the bound
query parameter.

For example:
```typescript
async find(@Query('user') user: string)
```

### Parameters

#### property

`string`

name of single property to extract from the `query` object

#### pipes

...([`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\> \| [`Type`](../interfaces/Type.md)\<[`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>\>)[]

one or more pipes to apply to the bound query parameter

### Returns

`ParameterDecorator`

### See

[Request object](https://docs.nestjs.com/controllers#request-object)

### Public Api
