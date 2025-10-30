# Function: applyDecorators()

> **applyDecorators**(...`decorators`): \<`TFunction`, `Y`\>(`target`, `propertyKey?`, `descriptor?`) => `void`

Defined in: packages/common/decorators/core/apply-decorators.ts:10

Function that returns a new decorator that applies all decorators provided by param

Useful to build new decorators (or a decorator factory) encapsulating multiple decorators related with the same feature

## Parameters

### decorators

...(`MethodDecorator` \| `ClassDecorator` \| `PropertyDecorator`)[]

one or more decorators (e.g., `ApplyGuard(...)`)

## Returns

> \<`TFunction`, `Y`\>(`target`, `propertyKey?`, `descriptor?`): `void`

### Type Parameters

#### TFunction

`TFunction` *extends* `Function`

#### Y

`Y`

### Parameters

#### target

`object` | `TFunction`

#### propertyKey?

`string` | `symbol`

#### descriptor?

`TypedPropertyDescriptor`\<`Y`\>

### Returns

`void`

## Public Api
