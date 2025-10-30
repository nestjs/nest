# Interface: INestMicroservice

Defined in: packages/common/interfaces/nest-microservice.interface.ts:14

Interface describing Microservice Context.

## Public Api

## Extends

- [`INestApplicationContext`](INestApplicationContext.md)

## Properties

### status

> **status**: `Observable`\<`string`\>

Defined in: packages/common/interfaces/nest-microservice.interface.ts:71

Returns an observable that emits status changes.

#### Returns

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: packages/common/interfaces/nest-microservice.interface.ts:64

Terminates the application.

#### Returns

`Promise`\<`void`\>

#### Overrides

[`INestApplicationContext`](INestApplicationContext.md).[`close`](INestApplicationContext.md#close)

***

### enableShutdownHooks()

> **enableShutdownHooks**(`signals?`): `this`

Defined in: packages/common/interfaces/nest-application-context.interface.ts:148

Enables the usage of shutdown hooks. Will call the
`onApplicationShutdown` function of a provider if the
process receives a shutdown signal.

#### Parameters

##### signals?

`string`[] | [`ShutdownSignal`](../enumerations/ShutdownSignal.md)[]

#### Returns

`this`

The Nest application context instance

#### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`enableShutdownHooks`](INestApplicationContext.md#enableshutdownhooks)

***

### flushLogs()

> **flushLogs**(): `void`

Defined in: packages/common/interfaces/nest-application-context.interface.ts:139

Prints buffered logs and detaches buffer.

#### Returns

`void`

#### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`flushLogs`](INestApplicationContext.md#flushlogs)

***

### get()

#### Call Signature

> **get**\<`TInput`, `TResult`\>(`typeOrToken`): `TResult`

Defined in: packages/common/interfaces/nest-application-context.interface.ts:42

Retrieves an instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](Type.md)\<`TInput`\>

##### Returns

`TResult`

##### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`get`](INestApplicationContext.md#get)

#### Call Signature

> **get**\<`TInput`, `TResult`\>(`typeOrToken`, `options`): `TResult`

Defined in: packages/common/interfaces/nest-application-context.interface.ts:49

Retrieves an instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](Type.md)\<`TInput`\>

###### options

###### each?

`false`

###### strict?

`boolean`

##### Returns

`TResult`

##### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`get`](INestApplicationContext.md#get)

#### Call Signature

> **get**\<`TInput`, `TResult`\>(`typeOrToken`, `options`): `TResult`[]

Defined in: packages/common/interfaces/nest-application-context.interface.ts:57

Retrieves a list of instances of either injectables or controllers, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](Type.md)\<`TInput`\>

###### options

###### each

`true`

###### strict?

`boolean`

##### Returns

`TResult`[]

##### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`get`](INestApplicationContext.md#get)

#### Call Signature

> **get**\<`TInput`, `TResult`\>(`typeOrToken`, `options?`): `TResult` \| `TResult`[]

Defined in: packages/common/interfaces/nest-application-context.interface.ts:65

Retrieves an instance (or a list of instances) of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](Type.md)\<`TInput`\>

###### options?

`GetOrResolveOptions`

##### Returns

`TResult` \| `TResult`[]

##### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`get`](INestApplicationContext.md#get)

***

### init()

> **init**(): `Promise`\<`INestMicroservice`\>

Defined in: packages/common/interfaces/nest-application-context.interface.ts:157

Initializes the Nest application.
Calls the Nest lifecycle events.
It isn't mandatory to call this method directly.

#### Returns

`Promise`\<`INestMicroservice`\>

The NestApplicationContext instance as Promise

#### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`init`](INestApplicationContext.md#init)

***

### listen()

> **listen**(): `Promise`\<`any`\>

Defined in: packages/common/interfaces/nest-microservice.interface.ts:20

Starts the microservice.

#### Returns

`Promise`\<`any`\>

***

### on()

> **on**\<`EventsMap`, `EventKey`, `EventCallback`\>(`event`, `callback`): `void`

Defined in: packages/common/interfaces/nest-microservice.interface.ts:78

Registers an event listener for the given event.

#### Type Parameters

##### EventsMap

`EventsMap` *extends* `Record`\<`string`, `Function`\> = `Record`\<`string`, `Function`\>

##### EventKey

`EventKey` *extends* `string` \| `number` \| `symbol` = keyof `EventsMap`

##### EventCallback

`EventCallback` *extends* `Function` = `EventsMap`\[`EventKey`\]

#### Parameters

##### event

`EventKey`

Event name

##### callback

`EventCallback`

Callback to be executed when the event is emitted

#### Returns

`void`

***

### registerRequestByContextId()

> **registerRequestByContextId**\<`T`\>(`request`, `contextId`): `void`

Defined in: packages/common/interfaces/nest-application-context.interface.ts:117

Registers the request/context object for a given context ID (DI container sub-tree).

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### request

`T`

##### contextId

###### id

`number`

#### Returns

`void`

#### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`registerRequestByContextId`](INestApplicationContext.md#registerrequestbycontextid)

***

### resolve()

#### Call Signature

> **resolve**\<`TInput`, `TResult`\>(`typeOrToken`): `Promise`\<`TResult`\>

Defined in: packages/common/interfaces/nest-application-context.interface.ts:74

Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](Type.md)\<`TInput`\>

##### Returns

`Promise`\<`TResult`\>

##### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`resolve`](INestApplicationContext.md#resolve)

#### Call Signature

> **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`): `Promise`\<`TResult`\>

Defined in: packages/common/interfaces/nest-application-context.interface.ts:81

Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](Type.md)\<`TInput`\>

###### contextId?

###### id

`number`

##### Returns

`Promise`\<`TResult`\>

##### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`resolve`](INestApplicationContext.md#resolve)

#### Call Signature

> **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`, `options?`): `Promise`\<`TResult`\>

Defined in: packages/common/interfaces/nest-application-context.interface.ts:89

Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](Type.md)\<`TInput`\>

###### contextId?

###### id

`number`

###### options?

###### each?

`false`

###### strict?

`boolean`

##### Returns

`Promise`\<`TResult`\>

##### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`resolve`](INestApplicationContext.md#resolve)

#### Call Signature

> **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`, `options?`): `Promise`\<`TResult`[]\>

Defined in: packages/common/interfaces/nest-application-context.interface.ts:98

Resolves transient or request-scoped instances of either injectables or controllers, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](Type.md)\<`TInput`\>

###### contextId?

###### id

`number`

###### options?

###### each

`true`

###### strict?

`boolean`

##### Returns

`Promise`\<`TResult`[]\>

##### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`resolve`](INestApplicationContext.md#resolve)

#### Call Signature

> **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`, `options?`): `Promise`\<`TResult` \| `TResult`[]\>

Defined in: packages/common/interfaces/nest-application-context.interface.ts:107

Resolves transient or request-scoped instance (or a list of instances) of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](Type.md)\<`TInput`\>

###### contextId?

###### id

`number`

###### options?

`GetOrResolveOptions`

##### Returns

`Promise`\<`TResult` \| `TResult`[]\>

##### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`resolve`](INestApplicationContext.md#resolve)

***

### select()

> **select**\<`T`\>(`module`, `options?`): [`INestApplicationContext`](INestApplicationContext.md)

Defined in: packages/common/interfaces/nest-application-context.interface.ts:33

Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.

#### Type Parameters

##### T

`T`

#### Parameters

##### module

[`DynamicModule`](DynamicModule.md) | [`Type`](Type.md)\<`T`\>

##### options?

`SelectOptions`

#### Returns

[`INestApplicationContext`](INestApplicationContext.md)

#### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`select`](INestApplicationContext.md#select)

***

### unwrap()

> **unwrap**\<`T`\>(): `T`

Defined in: packages/common/interfaces/nest-microservice.interface.ts:91

Returns an instance of the underlying server/broker instance,
or a group of servers if there are more than one.

#### Type Parameters

##### T

`T`

#### Returns

`T`

***

### useGlobalFilters()

> **useGlobalFilters**(...`filters`): `this`

Defined in: packages/common/interfaces/nest-microservice.interface.ts:36

Registers global exception filters (will be used for every pattern handler).

#### Parameters

##### filters

...[`ExceptionFilter`](ExceptionFilter.md)\<`any`\>[]

#### Returns

`this`

***

### useGlobalGuards()

> **useGlobalGuards**(...`guards`): `this`

Defined in: packages/common/interfaces/nest-microservice.interface.ts:57

Registers global guards (will be used for every pattern handler).

#### Parameters

##### guards

...[`CanActivate`](CanActivate.md)[]

#### Returns

`this`

***

### useGlobalInterceptors()

> **useGlobalInterceptors**(...`interceptors`): `this`

Defined in: packages/common/interfaces/nest-microservice.interface.ts:50

Registers global interceptors (will be used for every pattern handler).

#### Parameters

##### interceptors

...[`NestInterceptor`](NestInterceptor.md)\<`any`, `any`\>[]

#### Returns

`this`

***

### useGlobalPipes()

> **useGlobalPipes**(...`pipes`): `this`

Defined in: packages/common/interfaces/nest-microservice.interface.ts:43

Registers global pipes (will be used for every pattern handler).

#### Parameters

##### pipes

...[`PipeTransform`](PipeTransform.md)\<`any`, `any`\>[]

#### Returns

`this`

***

### useLogger()

> **useLogger**(`logger`): `void`

Defined in: packages/common/interfaces/nest-application-context.interface.ts:133

Sets custom logger service.
Flushes buffered logs if auto flush is on.

#### Parameters

##### logger

`false` | [`LoggerService`](LoggerService.md) | (`"verbose"` \| `"debug"` \| `"log"` \| `"warn"` \| `"error"` \| `"fatal"`)[]

#### Returns

`void`

#### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`useLogger`](INestApplicationContext.md#uselogger)

***

### useWebSocketAdapter()

> **useWebSocketAdapter**(`adapter`): `this`

Defined in: packages/common/interfaces/nest-microservice.interface.ts:29

Registers a web socket adapter that will be used for Gateways.
Use to override the default `socket.io` library.

#### Parameters

##### adapter

[`WebSocketAdapter`](WebSocketAdapter.md)

#### Returns

`this`
