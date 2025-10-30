# Interface: WebSocketAdapter\<TServer, TClient, TOptions\>

Defined in: packages/common/interfaces/websockets/web-socket-adapter.interface.ts:15

## Public Api

## Type Parameters

### TServer

`TServer` = `any`

### TClient

`TClient` = `any`

### TOptions

`TOptions` = `any`

## Methods

### bindClientConnect()

> **bindClientConnect**(`server`, `callback`): `any`

Defined in: packages/common/interfaces/websockets/web-socket-adapter.interface.ts:21

#### Parameters

##### server

`TServer`

##### callback

`Function`

#### Returns

`any`

***

### bindClientDisconnect()?

> `optional` **bindClientDisconnect**(`client`, `callback`): `any`

Defined in: packages/common/interfaces/websockets/web-socket-adapter.interface.ts:22

#### Parameters

##### client

`TClient`

##### callback

`Function`

#### Returns

`any`

***

### bindMessageHandlers()

> **bindMessageHandlers**(`client`, `handlers`, `transform`): `any`

Defined in: packages/common/interfaces/websockets/web-socket-adapter.interface.ts:23

#### Parameters

##### client

`TClient`

##### handlers

[`WsMessageHandler`](WsMessageHandler.md)\<`string`\>[]

##### transform

(`data`) => `Observable`\<`any`\>

#### Returns

`any`

***

### close()

> **close**(`server`): `any`

Defined in: packages/common/interfaces/websockets/web-socket-adapter.interface.ts:28

#### Parameters

##### server

`TServer`

#### Returns

`any`

***

### create()

> **create**(`port`, `options?`): `TServer`

Defined in: packages/common/interfaces/websockets/web-socket-adapter.interface.ts:20

#### Parameters

##### port

`number`

##### options?

`TOptions`

#### Returns

`TServer`
