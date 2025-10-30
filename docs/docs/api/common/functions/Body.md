# Function: Body()

Route handler parameter decorator. Extracts the entire `body` object
property, or optionally a named property of the `body` object, from
the `req` object and populates the decorated parameter with that value.
Also applies pipes to the bound body parameter.

For example:
```typescript
async create(@Body('role', new ValidationPipe()) role: string)
```

## Param

name of single property to extract from the `body` object

## Param

one or more pipes - either instances or classes - to apply to
the bound body parameter.

## See

 - [Request object](https://docs.nestjs.com/controllers#request-object)
 - [Working with pipes](https://docs.nestjs.com/custom-decorators#working-with-pipes)

## Public Api

## Call Signature

> **Body**(): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:432

Route handler parameter decorator. Extracts the entire `body`
object from the `req` object and populates the decorated
parameter with the value of `body`.

For example:
```typescript
async create(@Body() createDto: CreateCatDto)
```

### Returns

`ParameterDecorator`

### See

[Request object](https://docs.nestjs.com/controllers#request-object)

### Public Api

## Call Signature

> **Body**(...`pipes`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:453

Route handler parameter decorator. Extracts the entire `body`
object from the `req` object and populates the decorated
parameter with the value of `body`. Also applies the specified
pipes to that parameter.

For example:
```typescript
async create(@Body(new ValidationPipe()) createDto: CreateCatDto)
```

### Parameters

#### pipes

...([`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\> \| [`Type`](../interfaces/Type.md)\<[`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>\>)[]

one or more pipes - either instances or classes - to apply to
the bound body parameter.

### Returns

`ParameterDecorator`

### See

 - [Request object](https://docs.nestjs.com/controllers#request-object)
 - [Working with pipes](https://docs.nestjs.com/custom-decorators#working-with-pipes)

### Public Api

## Call Signature

> **Body**(`property`, ...`pipes`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:477

Route handler parameter decorator. Extracts a single property from
the `body` object property of the `req` object and populates the decorated
parameter with the value of that property. Also applies pipes to the bound
body parameter.

For example:
```typescript
async create(@Body('role', new ValidationPipe()) role: string)
```

### Parameters

#### property

`string`

name of single property to extract from the `body` object

#### pipes

...([`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\> \| [`Type`](../interfaces/Type.md)\<[`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>\>)[]

one or more pipes - either instances or classes - to apply to
the bound body parameter.

### Returns

`ParameterDecorator`

### See

 - [Request object](https://docs.nestjs.com/controllers#request-object)
 - [Working with pipes](https://docs.nestjs.com/custom-decorators#working-with-pipes)

### Public Api
