# Function: HostParam()

Route handler parameter decorator. Extracts the `hosts`
property from the `req` object and populates the decorated
parameter with the value of `params`. May also apply pipes to the bound
parameter.

For example, extracting all params:
```typescript
findOne(@HostParam() params: string[])
```

For example, extracting a single param:
```typescript
findOne(@HostParam('id') id: string)
```

## Param

name of single property to extract from the `req` object

## See

[Request object](https://docs.nestjs.com/controllers#request-object)

## Public Api

## Call Signature

> **HostParam**(): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:720

Route handler parameter decorator. Extracts the `hosts`
property from the `req` object and populates the decorated
parameter with the value of `hosts`. May also apply pipes to the bound
parameter.

For example, extracting all params:
```typescript
findOne(@HostParam() params: string[])
```

For example, extracting a single param:
```typescript
findOne(@HostParam('id') id: string)
```

### Returns

`ParameterDecorator`

### See

[Request object](https://docs.nestjs.com/controllers#request-object)

### Public Api

## Call Signature

> **HostParam**(`property`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:742

Route handler parameter decorator. Extracts the `hosts`
property from the `req` object and populates the decorated
parameter with the value of `hosts`. May also apply pipes to the bound
parameter.

For example, extracting all params:
```typescript
findOne(@HostParam() params: string[])
```

For example, extracting a single param:
```typescript
findOne(@HostParam('id') id: string)
```

### Parameters

#### property

`string`

name of single property to extract from the `req` object

### Returns

`ParameterDecorator`

### See

[Request object](https://docs.nestjs.com/controllers#request-object)

### Public Api
