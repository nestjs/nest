# Function: Param()

Route handler parameter decorator. Extracts the `params`
property from the `req` object and populates the decorated
parameter with the value of `params`. May also apply pipes to the bound
parameter.

For example, extracting all params:
```typescript
findOne(@Param() params: string[])
```

For example, extracting a single param:
```typescript
findOne(@Param('id') id: string)
```

## Param

name of single property to extract from the `req` object

## Param

one or more pipes - either instances or classes - to apply to
the bound parameter.

## See

 - [Request object](https://docs.nestjs.com/controllers#request-object)
 - [Working with pipes](https://docs.nestjs.com/custom-decorators#working-with-pipes)

## Public Api

## Call Signature

> **Param**(): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:609

Route handler parameter decorator. Extracts the `params`
property from the `req` object and populates the decorated
parameter with the value of `params`. May also apply pipes to the bound
parameter.

For example, extracting all params:
```typescript
findOne(@Param() params: string[])
```

For example, extracting a single param:
```typescript
findOne(@Param('id') id: string)
```

### Returns

`ParameterDecorator`

### See

 - [Request object](https://docs.nestjs.com/controllers#request-object)
 - [Working with pipes](https://docs.nestjs.com/custom-decorators#working-with-pipes)

### Public Api

## Call Signature

> **Param**(...`pipes`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:634

Route handler parameter decorator. Extracts the `params`
property from the `req` object and populates the decorated
parameter with the value of `params`. May also apply pipes to the bound
parameter.

For example, extracting all params:
```typescript
findOne(@Param() params: string[])
```

For example, extracting a single param:
```typescript
findOne(@Param('id') id: string)
```

### Parameters

#### pipes

...([`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\> \| [`Type`](../interfaces/Type.md)\<[`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>\>)[]

one or more pipes - either instances or classes - to apply to
the bound parameter.

### Returns

`ParameterDecorator`

### See

 - [Request object](https://docs.nestjs.com/controllers#request-object)
 - [Working with pipes](https://docs.nestjs.com/custom-decorators#working-with-pipes)

### Public Api

## Call Signature

> **Param**(`property`, ...`pipes`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:661

Route handler parameter decorator. Extracts the `params`
property from the `req` object and populates the decorated
parameter with the value of `params`. May also apply pipes to the bound
parameter.

For example, extracting all params:
```typescript
findOne(@Param() params: string[])
```

For example, extracting a single param:
```typescript
findOne(@Param('id') id: string)
```

### Parameters

#### property

`string`

name of single property to extract from the `req` object

#### pipes

...([`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\> \| [`Type`](../interfaces/Type.md)\<[`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>\>)[]

one or more pipes - either instances or classes - to apply to
the bound parameter.

### Returns

`ParameterDecorator`

### See

 - [Request object](https://docs.nestjs.com/controllers#request-object)
 - [Working with pipes](https://docs.nestjs.com/custom-decorators#working-with-pipes)

### Public Api
