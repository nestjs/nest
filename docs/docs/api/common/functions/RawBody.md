# Function: RawBody()

Route handler parameter decorator. Extracts the `rawBody` Buffer
property from the `req` object and populates the decorated parameter with that value.
Also applies pipes to the bound rawBody parameter.

For example:
```typescript
async create(@RawBody(new ValidationPipe()) rawBody: Buffer)
```

## Param

one or more pipes - either instances or classes - to apply to
the bound body parameter.

## See

 - [Request object](https://docs.nestjs.com/controllers#request-object)
 - [Raw body](https://docs.nestjs.com/faq/raw-body)
 - [Working with pipes](https://docs.nestjs.com/custom-decorators#working-with-pipes)

## Public Api

## Call Signature

> **RawBody**(): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:526

Route handler parameter decorator. Extracts the `rawBody` Buffer
property from the `req` object and populates the decorated parameter with that value.

For example:
```typescript
async create(@RawBody() rawBody: Buffer | undefined)
```

### Returns

`ParameterDecorator`

### See

 - [Request object](https://docs.nestjs.com/controllers#request-object)
 - [Raw body](https://docs.nestjs.com/faq/raw-body)

### Public Api

## Call Signature

> **RawBody**(...`pipes`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:547

Route handler parameter decorator. Extracts the `rawBody` Buffer
property from the `req` object and populates the decorated parameter with that value.
Also applies pipes to the bound rawBody parameter.

For example:
```typescript
async create(@RawBody(new ValidationPipe()) rawBody: Buffer)
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
 - [Raw body](https://docs.nestjs.com/faq/raw-body)
 - [Working with pipes](https://docs.nestjs.com/custom-decorators#working-with-pipes)

### Public Api
