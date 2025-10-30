# Interface: ArgumentsHost

Defined in: packages/common/interfaces/features/arguments-host.interface.ts:64

Provides methods for retrieving the arguments being passed to a handler.
Allows choosing the appropriate execution context (e.g., Http, RPC, or
WebSockets) to retrieve the arguments from.

## Public Api

## Extended by

- [`ExecutionContext`](ExecutionContext.md)

## Methods

### getArgByIndex()

> **getArgByIndex**\<`T`\>(`index`): `T`

Defined in: packages/common/interfaces/features/arguments-host.interface.ts:73

Returns a particular argument by index.

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### index

`number`

index of argument to retrieve

#### Returns

`T`

***

### getArgs()

> **getArgs**\<`T`\>(): `T`

Defined in: packages/common/interfaces/features/arguments-host.interface.ts:68

Returns the array of arguments being passed to the handler.

#### Type Parameters

##### T

`T` *extends* `any`[] = `any`[]

#### Returns

`T`

***

### getType()

> **getType**\<`TContext`\>(): `TContext`

Defined in: packages/common/interfaces/features/arguments-host.interface.ts:92

Returns the current execution context type (string)

#### Type Parameters

##### TContext

`TContext` *extends* `string` = [`ContextType`](../type-aliases/ContextType.md)

#### Returns

`TContext`

***

### switchToHttp()

> **switchToHttp**(): `HttpArgumentsHost`

Defined in: packages/common/interfaces/features/arguments-host.interface.ts:83

Switch context to HTTP.

#### Returns

`HttpArgumentsHost`

interface with methods to retrieve HTTP arguments

***

### switchToRpc()

> **switchToRpc**(): `RpcArgumentsHost`

Defined in: packages/common/interfaces/features/arguments-host.interface.ts:78

Switch context to RPC.

#### Returns

`RpcArgumentsHost`

interface with methods to retrieve RPC arguments

***

### switchToWs()

> **switchToWs**(): `WsArgumentsHost`

Defined in: packages/common/interfaces/features/arguments-host.interface.ts:88

Switch context to WebSockets.

#### Returns

`WsArgumentsHost`

interface with methods to retrieve WebSockets arguments
