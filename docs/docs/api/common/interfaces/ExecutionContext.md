# Interface: ExecutionContext

Defined in: packages/common/interfaces/features/execution-context.interface.ts:11

Interface describing details about the current request pipeline.

## See

[Execution Context](https://docs.nestjs.com/guards#execution-context)

## Public Api

## Extends

- [`ArgumentsHost`](ArgumentsHost.md)

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

#### Inherited from

[`ArgumentsHost`](ArgumentsHost.md).[`getArgByIndex`](ArgumentsHost.md#getargbyindex)

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

#### Inherited from

[`ArgumentsHost`](ArgumentsHost.md).[`getArgs`](ArgumentsHost.md#getargs)

***

### getClass()

> **getClass**\<`T`\>(): [`Type`](Type.md)\<`T`\>

Defined in: packages/common/interfaces/features/execution-context.interface.ts:15

Returns the *type* of the controller class which the current handler belongs to.

#### Type Parameters

##### T

`T` = `any`

#### Returns

[`Type`](Type.md)\<`T`\>

***

### getHandler()

> **getHandler**(): `Function`

Defined in: packages/common/interfaces/features/execution-context.interface.ts:20

Returns a reference to the handler (method) that will be invoked next in the
request pipeline.

#### Returns

`Function`

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

#### Inherited from

[`ArgumentsHost`](ArgumentsHost.md).[`getType`](ArgumentsHost.md#gettype)

***

### switchToHttp()

> **switchToHttp**(): `HttpArgumentsHost`

Defined in: packages/common/interfaces/features/arguments-host.interface.ts:83

Switch context to HTTP.

#### Returns

`HttpArgumentsHost`

interface with methods to retrieve HTTP arguments

#### Inherited from

[`ArgumentsHost`](ArgumentsHost.md).[`switchToHttp`](ArgumentsHost.md#switchtohttp)

***

### switchToRpc()

> **switchToRpc**(): `RpcArgumentsHost`

Defined in: packages/common/interfaces/features/arguments-host.interface.ts:78

Switch context to RPC.

#### Returns

`RpcArgumentsHost`

interface with methods to retrieve RPC arguments

#### Inherited from

[`ArgumentsHost`](ArgumentsHost.md).[`switchToRpc`](ArgumentsHost.md#switchtorpc)

***

### switchToWs()

> **switchToWs**(): `WsArgumentsHost`

Defined in: packages/common/interfaces/features/arguments-host.interface.ts:88

Switch context to WebSockets.

#### Returns

`WsArgumentsHost`

interface with methods to retrieve WebSockets arguments

#### Inherited from

[`ArgumentsHost`](ArgumentsHost.md).[`switchToWs`](ArgumentsHost.md#switchtows)
