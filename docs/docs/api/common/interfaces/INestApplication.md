# Interface: INestApplication\<TServer\>

Defined in: packages/common/interfaces/nest-application.interface.ts:20

Interface defining the core NestApplication object.

## Public Api

## Extends

- [`INestApplicationContext`](INestApplicationContext.md)

## Type Parameters

### TServer

`TServer` = `any`

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: packages/common/interfaces/nest-application.interface.ts:164

Terminates the application (including NestApplication, Gateways, and each connected
microservice)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`INestApplicationContext`](INestApplicationContext.md).[`close`](INestApplicationContext.md#close)

***

### connectMicroservice()

> **connectMicroservice**\<`T`\>(`options`, `hybridOptions?`): [`INestMicroservice`](INestMicroservice.md)

Defined in: packages/common/interfaces/nest-application.interface.ts:95

Connects microservice to the NestApplication instance. Transforms application
to a hybrid instance.

#### Type Parameters

##### T

`T` *extends* `object` = `any`

#### Parameters

##### options

`T`

Microservice options object

##### hybridOptions?

[`NestHybridApplicationOptions`](NestHybridApplicationOptions.md)

Hybrid options object

#### Returns

[`INestMicroservice`](INestMicroservice.md)

***

### enableCors()

> **enableCors**(`options?`): `void`

Defined in: packages/common/interfaces/nest-application.interface.ts:35

Enables CORS (Cross-Origin Resource Sharing)

#### Parameters

##### options?

`any`

#### Returns

`void`

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

### enableVersioning()

> **enableVersioning**(`options?`): `this`

Defined in: packages/common/interfaces/nest-application.interface.ts:44

Enables Versioning for the application.
By default, URI-based versioning is used.

#### Parameters

##### options?

[`VersioningOptions`](../type-aliases/VersioningOptions.md)

#### Returns

`this`

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

### getHttpAdapter()

> **getHttpAdapter**(): [`HttpServer`](HttpServer.md)

Defined in: packages/common/interfaces/nest-application.interface.ts:119

Returns the underlying HTTP adapter.

#### Returns

[`HttpServer`](HttpServer.md)

***

### getHttpServer()

> **getHttpServer**(): `TServer`

Defined in: packages/common/interfaces/nest-application.interface.ts:112

Returns the underlying native HTTP server.

#### Returns

`TServer`

***

### getMicroservices()

> **getMicroservices**(): [`INestMicroservice`](INestMicroservice.md)[]

Defined in: packages/common/interfaces/nest-application.interface.ts:105

Returns array of the microservices connected to the NestApplication.

#### Returns

[`INestMicroservice`](INestMicroservice.md)[]

***

### getUrl()

> **getUrl**(): `Promise`\<`string`\>

Defined in: packages/common/interfaces/nest-application.interface.ts:66

Returns the url the application is listening at, based on OS and IP version. Returns as an IP value either in IPv6 or IPv4

#### Returns

`Promise`\<`string`\>

The IP where the server is listening

***

### init()

> **init**(): `Promise`\<`INestApplication`\<`TServer`\>\>

Defined in: packages/common/interfaces/nest-application-context.interface.ts:157

Initializes the Nest application.
Calls the Nest lifecycle events.
It isn't mandatory to call this method directly.

#### Returns

`Promise`\<`INestApplication`\<`TServer`\>\>

The NestApplicationContext instance as Promise

#### Inherited from

[`INestApplicationContext`](INestApplicationContext.md).[`init`](INestApplicationContext.md#init)

***

### listen()

#### Call Signature

> **listen**(`port`, `callback?`): `Promise`\<`any`\>

Defined in: packages/common/interfaces/nest-application.interface.ts:54

Starts the application.

##### Parameters

###### port

`string` | `number`

###### callback?

() => `void`

Optional callback

##### Returns

`Promise`\<`any`\>

A Promise that, when resolved, is a reference to the underlying HttpServer.

#### Call Signature

> **listen**(`port`, `hostname`, `callback?`): `Promise`\<`any`\>

Defined in: packages/common/interfaces/nest-application.interface.ts:55

##### Parameters

###### port

`string` | `number`

###### hostname

`string`

###### callback?

() => `void`

##### Returns

`Promise`\<`any`\>

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

### setGlobalPrefix()

> **setGlobalPrefix**(`prefix`, `options?`): `this`

Defined in: packages/common/interfaces/nest-application.interface.ts:75

Registers a prefix for every HTTP route path.

#### Parameters

##### prefix

`string`

The prefix for every HTTP route path (for example `/v1/api`)

##### options?

`GlobalPrefixOptions`\<`string` \| `RouteInfo`\>

Global prefix options object

#### Returns

`this`

***

### startAllMicroservices()

> **startAllMicroservices**(): `Promise`\<`INestApplication`\<`TServer`\>\>

Defined in: packages/common/interfaces/nest-application.interface.ts:126

Starts all connected microservices asynchronously.

#### Returns

`Promise`\<`INestApplication`\<`TServer`\>\>

***

### use()

> **use**(...`args`): `this`

Defined in: packages/common/interfaces/nest-application.interface.ts:28

A wrapper function around HTTP adapter method: `adapter.use()`.
Example `app.use(cors())`

#### Parameters

##### args

...`any`[]

#### Returns

`this`

***

### useGlobalFilters()

> **useGlobalFilters**(...`filters`): `this`

Defined in: packages/common/interfaces/nest-application.interface.ts:134

Registers exception filters as global filters (will be used within
every HTTP route handler)

#### Parameters

##### filters

...[`ExceptionFilter`](ExceptionFilter.md)\<`any`\>[]

#### Returns

`this`

***

### useGlobalGuards()

> **useGlobalGuards**(...`guards`): `this`

Defined in: packages/common/interfaces/nest-application.interface.ts:156

Registers guards as global guards (will be used within every HTTP route handler)

#### Parameters

##### guards

...[`CanActivate`](CanActivate.md)[]

#### Returns

`this`

***

### useGlobalInterceptors()

> **useGlobalInterceptors**(...`interceptors`): `this`

Defined in: packages/common/interfaces/nest-application.interface.ts:149

Registers interceptors as global interceptors (will be used within
every HTTP route handler)

#### Parameters

##### interceptors

...[`NestInterceptor`](NestInterceptor.md)\<`any`, `any`\>[]

#### Returns

`this`

***

### useGlobalPipes()

> **useGlobalPipes**(...`pipes`): `this`

Defined in: packages/common/interfaces/nest-application.interface.ts:141

Registers pipes as global pipes (will be used within every HTTP route handler)

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

Defined in: packages/common/interfaces/nest-application.interface.ts:84

Register Ws Adapter which will be used inside Gateways.
Use when you want to override default `socket.io` library.

#### Parameters

##### adapter

[`WebSocketAdapter`](WebSocketAdapter.md)

#### Returns

`this`
