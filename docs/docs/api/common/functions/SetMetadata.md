# Function: SetMetadata()

> **SetMetadata**\<`K`, `V`\>(`metadataKey`, `metadataValue`): [`CustomDecorator`](../type-aliases/CustomDecorator.md)\<`K`\>

Defined in: packages/common/decorators/core/set-metadata.decorator.ts:22

Decorator that assigns metadata to the class/function using the
specified `key`.

Requires two parameters:
- `key` - a value defining the key under which the metadata is stored
- `value` - metadata to be associated with `key`

This metadata can be reflected using the `Reflector` class.

Example: `@SetMetadata('roles', ['admin'])`

## Type Parameters

### K

`K` = `string`

### V

`V` = `any`

## Parameters

### metadataKey

`K`

### metadataValue

`V`

## Returns

[`CustomDecorator`](../type-aliases/CustomDecorator.md)\<`K`\>

## See

[Reflection](https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata)

## Public Api
