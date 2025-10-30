# Class: NestApplication

Defined in: packages/core/nest-application.ts:54

## Public Api

## Extends

- [`NestApplicationContext`](NestApplicationContext.md)\<[`NestApplicationOptions`](../../common/interfaces/NestApplicationOptions.md)\>

## Implements

- [`INestApplication`](../../common/interfaces/INestApplication.md)

## Constructors

### Constructor

> **new NestApplication**(`container`, `httpAdapter`, `config`, `graphInspector`, `appOptions`): `NestApplication`

Defined in: packages/core/nest-application.ts:73

#### Parameters

##### container

[`NestContainer`](NestContainer.md)

##### httpAdapter

[`HttpServer`](../../common/interfaces/HttpServer.md)

##### config

[`ApplicationConfig`](ApplicationConfig.md)

##### graphInspector

[`GraphInspector`](GraphInspector.md)

##### appOptions

[`NestApplicationOptions`](../../common/interfaces/NestApplicationOptions.md) = `{}`

#### Returns

`NestApplication`

#### Overrides

[`NestApplicationContext`](NestApplicationContext.md).[`constructor`](NestApplicationContext.md#constructor)

## Properties

### appOptions

> `protected` `readonly` **appOptions**: [`NestApplicationOptions`](../../common/interfaces/NestApplicationOptions.md)

Defined in: packages/core/nest-application-context.ts:69

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`appOptions`](NestApplicationContext.md#appoptions)

***

### container

> `protected` `readonly` **container**: [`NestContainer`](NestContainer.md)

Defined in: packages/core/nest-application-context.ts:68

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`container`](NestApplicationContext.md#container)

***

### injector

> `protected` **injector**: `Injector`

Defined in: packages/core/nest-application-context.ts:47

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`injector`](NestApplicationContext.md#injector)

***

### isInitialized

> `protected` **isInitialized**: `boolean` = `false`

Defined in: packages/core/nest-application-context.ts:46

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`isInitialized`](NestApplicationContext.md#isinitialized)

***

### logger

> `protected` `readonly` **logger**: [`Logger`](../../common/classes/Logger.md)

Defined in: packages/core/nest-application.ts:58

#### Overrides

[`NestApplicationContext`](NestApplicationContext.md).[`logger`](NestApplicationContext.md#logger)

## Accessors

### instanceLinksHost

#### Get Signature

> **get** `protected` **instanceLinksHost**(): `InstanceLinksHost`

Defined in: packages/core/nest-application-context.ts:60

##### Returns

`InstanceLinksHost`

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`instanceLinksHost`](NestApplicationContext.md#instancelinkshost)

## Methods

### applyOptions()

> **applyOptions**(): `void`

Defined in: packages/core/nest-application.ts:122

#### Returns

`void`

***

### assertNotInPreviewMode()

> `protected` **assertNotInPreviewMode**(`methodName`): `void`

Defined in: packages/core/nest-application-context.ts:465

#### Parameters

##### methodName

`string`

#### Returns

`void`

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`assertNotInPreviewMode`](NestApplicationContext.md#assertnotinpreviewmode)

***

### callBeforeShutdownHook()

> `protected` **callBeforeShutdownHook**(`signal?`): `Promise`\<`void`\>

Defined in: packages/core/nest-application-context.ts:455

Calls the `beforeApplicationShutdown` function on the registered
modules and children.

#### Parameters

##### signal?

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`callBeforeShutdownHook`](NestApplicationContext.md#callbeforeshutdownhook)

***

### callBootstrapHook()

> `protected` **callBootstrapHook**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application-context.ts:430

Calls the `onApplicationBootstrap` function on the registered
modules and its children.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`callBootstrapHook`](NestApplicationContext.md#callbootstraphook)

***

### callDestroyHook()

> `protected` **callDestroyHook**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application-context.ts:416

Calls the `onModuleDestroy` function on the registered
modules and its children.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`callDestroyHook`](NestApplicationContext.md#calldestroyhook)

***

### callInitHook()

> `protected` **callInitHook**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application-context.ts:405

Calls the `onModuleInit` function on the registered
modules and its children.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`callInitHook`](NestApplicationContext.md#callinithook)

***

### callShutdownHook()

> `protected` **callShutdownHook**(`signal?`): `Promise`\<`void`\>

Defined in: packages/core/nest-application-context.ts:441

Calls the `onApplicationShutdown` function on the registered
modules and children.

#### Parameters

##### signal?

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`callShutdownHook`](NestApplicationContext.md#callshutdownhook)

***

### close()

> **close**(`signal?`): `Promise`\<`void`\>

Defined in: packages/core/nest-application-context.ts:276

Terminates the application

#### Parameters

##### signal?

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`close`](../../common/interfaces/INestApplication.md#close)

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`close`](NestApplicationContext.md#close)

***

### connectMicroservice()

> **connectMicroservice**\<`T`\>(`microserviceOptions`, `hybridAppOptions`): [`INestMicroservice`](../../common/interfaces/INestMicroservice.md)

Defined in: packages/core/nest-application.ts:218

Connects microservice to the NestApplication instance. Transforms application
to a hybrid instance.

#### Type Parameters

##### T

`T` *extends* `object`

#### Parameters

##### microserviceOptions

`T`

##### hybridAppOptions

[`NestHybridApplicationOptions`](../../common/interfaces/NestHybridApplicationOptions.md) = `{}`

#### Returns

[`INestMicroservice`](../../common/interfaces/INestMicroservice.md)

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`connectMicroservice`](../../common/interfaces/INestApplication.md#connectmicroservice)

***

### createServer()

> **createServer**\<`T`\>(): `T`

Defined in: packages/core/nest-application.ts:134

#### Type Parameters

##### T

`T` = `any`

#### Returns

`T`

***

### dispose()

> `protected` **dispose**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application.ts:97

#### Returns

`Promise`\<`void`\>

#### Overrides

[`NestApplicationContext`](NestApplicationContext.md).[`dispose`](NestApplicationContext.md#dispose)

***

### enableCors()

> **enableCors**(`options?`): `void`

Defined in: packages/core/nest-application.ts:282

Enables CORS (Cross-Origin Resource Sharing)

#### Parameters

##### options?

`any`

#### Returns

`void`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`enableCors`](../../common/interfaces/INestApplication.md#enablecors)

***

### enableShutdownHooks()

> **enableShutdownHooks**(`signals?`): `this`

Defined in: packages/core/nest-application-context.ts:322

Enables the usage of shutdown hooks. Will call the
`onApplicationShutdown` function of a provider if the
process receives a shutdown signal.

#### Parameters

##### signals?

`string`[] = `[]`

The system signals it should listen to

#### Returns

`this`

The Nest application context instance

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`enableShutdownHooks`](../../common/interfaces/INestApplication.md#enableshutdownhooks)

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`enableShutdownHooks`](NestApplicationContext.md#enableshutdownhooks)

***

### enableVersioning()

> **enableVersioning**(`options`): `this`

Defined in: packages/core/nest-application.ts:286

Enables Versioning for the application.
By default, URI-based versioning is used.

#### Parameters

##### options

[`VersioningOptions`](../../common/type-aliases/VersioningOptions.md) = `...`

#### Returns

`this`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`enableVersioning`](../../common/interfaces/INestApplication.md#enableversioning)

***

### find()

> `protected` **find**\<`TInput`, `TResult`\>(`typeOrToken`, `options`): `TResult` \| `TResult`[]

Defined in: packages/core/injector/abstract-instance-resolver.ts:21

#### Type Parameters

##### TInput

`TInput` = `any`

##### TResult

`TResult` = `TInput`

#### Parameters

##### typeOrToken

`string` | `symbol` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\> | [`Abstract`](../../common/interfaces/Abstract.md)\<`TInput`\>

##### options

###### each?

`boolean`

###### moduleId?

`string`

#### Returns

`TResult` \| `TResult`[]

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`find`](NestApplicationContext.md#find)

***

### flushLogs()

> **flushLogs**(): `void`

Defined in: packages/core/nest-application-context.ts:302

Prints buffered logs and detaches buffer.

#### Returns

`void`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`flushLogs`](../../common/interfaces/INestApplication.md#flushlogs)

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`flushLogs`](NestApplicationContext.md#flushlogs)

***

### flushLogsOnOverride()

> **flushLogsOnOverride**(): `void`

Defined in: packages/core/nest-application-context.ts:309

Define that it must flush logs right after defining a custom logger.

#### Returns

`void`

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`flushLogsOnOverride`](NestApplicationContext.md#flushlogsonoverride)

***

### get()

Retrieves an instance (or a list of instances) of either injectable or controller, otherwise, throws exception.

#### Call Signature

> **get**\<`TInput`, `TResult`\>(`typeOrToken`): `TResult`

Defined in: packages/core/nest-application-context.ts:135

Retrieves an instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

##### Returns

`TResult`

##### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`get`](../../common/interfaces/INestApplication.md#get)

##### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`get`](NestApplicationContext.md#get)

#### Call Signature

> **get**\<`TInput`, `TResult`\>(`typeOrToken`, `options`): `TResult`

Defined in: packages/core/nest-application-context.ts:142

Retrieves an instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

###### options

###### each?

`false`

###### strict?

`boolean`

##### Returns

`TResult`

##### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`get`](../../common/interfaces/INestApplication.md#get)

##### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`get`](NestApplicationContext.md#get)

#### Call Signature

> **get**\<`TInput`, `TResult`\>(`typeOrToken`, `options`): `TResult`[]

Defined in: packages/core/nest-application-context.ts:153

Retrieves a list of instances of either injectables or controllers, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

###### options

###### each

`true`

###### strict?

`boolean`

##### Returns

`TResult`[]

##### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`get`](../../common/interfaces/INestApplication.md#get)

##### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`get`](NestApplicationContext.md#get)

***

### getHttpAdapter()

> **getHttpAdapter**(): [`AbstractHttpAdapter`](AbstractHttpAdapter.md)

Defined in: packages/core/nest-application.ts:110

Returns the underlying HTTP adapter.

#### Returns

[`AbstractHttpAdapter`](AbstractHttpAdapter.md)

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`getHttpAdapter`](../../common/interfaces/INestApplication.md#gethttpadapter)

***

### getHttpServer()

> **getHttpServer**(): `any`

Defined in: packages/core/nest-application.ts:253

Returns the underlying native HTTP server.

#### Returns

`any`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`getHttpServer`](../../common/interfaces/INestApplication.md#gethttpserver)

***

### getMicroservices()

> **getMicroservices**(): [`INestMicroservice`](../../common/interfaces/INestMicroservice.md)[]

Defined in: packages/core/nest-application.ts:249

Returns array of the microservices connected to the NestApplication.

#### Returns

[`INestMicroservice`](../../common/interfaces/INestMicroservice.md)[]

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`getMicroservices`](../../common/interfaces/INestApplication.md#getmicroservices)

***

### getUnderlyingHttpServer()

> **getUnderlyingHttpServer**\<`T`\>(): `T`

Defined in: packages/core/nest-application.ts:118

#### Type Parameters

##### T

`T`

#### Returns

`T`

***

### getUrl()

> **getUrl**(): `Promise`\<`string`\>

Defined in: packages/core/nest-application.ts:342

Returns the url the application is listening at, based on OS and IP version. Returns as an IP value either in IPv6 or IPv4

#### Returns

`Promise`\<`string`\>

The IP where the server is listening

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`getUrl`](../../common/interfaces/INestApplication.md#geturl)

***

### init()

> **init**(): `Promise`\<`NestApplication`\>

Defined in: packages/core/nest-application.ts:176

Initializes the Nest application.
Calls the Nest lifecycle events.

#### Returns

`Promise`\<`NestApplication`\>

The NestApplicationContext instance as Promise

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`init`](../../common/interfaces/INestApplication.md#init)

#### Overrides

[`NestApplicationContext`](NestApplicationContext.md).[`init`](NestApplicationContext.md#init)

***

### listen()

#### Call Signature

> **listen**(`port`): `Promise`\<`any`\>

Defined in: packages/core/nest-application.ts:293

Starts the application.

##### Parameters

###### port

`string` | `number`

##### Returns

`Promise`\<`any`\>

A Promise that, when resolved, is a reference to the underlying HttpServer.

##### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`listen`](../../common/interfaces/INestApplication.md#listen)

#### Call Signature

> **listen**(`port`, `hostname`): `Promise`\<`any`\>

Defined in: packages/core/nest-application.ts:294

##### Parameters

###### port

`string` | `number`

###### hostname

`string`

##### Returns

`Promise`\<`any`\>

##### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`listen`](../../common/interfaces/INestApplication.md#listen)

***

### listenToShutdownSignals()

> `protected` **listenToShutdownSignals**(`signals`): `void`

Defined in: packages/core/nest-application-context.ts:355

Listens to shutdown signals by listening to
process events

#### Parameters

##### signals

`string`[]

The system signals it should listen to

#### Returns

`void`

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`listenToShutdownSignals`](NestApplicationContext.md#listentoshutdownsignals)

***

### registerHttpServer()

> **registerHttpServer**(): `void`

Defined in: packages/core/nest-application.ts:114

#### Returns

`void`

***

### registerModules()

> **registerModules**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application.ts:139

#### Returns

`Promise`\<`void`\>

***

### registerParserMiddleware()

> **registerParserMiddleware**(): `void`

Defined in: packages/core/nest-application.ts:199

#### Returns

`void`

***

### registerRequestByContextId()

> **registerRequestByContextId**\<`T`\>(`request`, `contextId`): `void`

Defined in: packages/core/nest-application-context.ts:242

Registers the request/context object for a given context ID (DI container sub-tree).

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### request

`T`

##### contextId

[`ContextId`](../interfaces/ContextId.md)

#### Returns

`void`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`registerRequestByContextId`](../../common/interfaces/INestApplication.md#registerrequestbycontextid)

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`registerRequestByContextId`](NestApplicationContext.md#registerrequestbycontextid)

***

### registerRouter()

> **registerRouter**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application.ts:205

#### Returns

`Promise`\<`void`\>

***

### registerRouterHooks()

> **registerRouterHooks**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application.ts:213

#### Returns

`Promise`\<`void`\>

***

### registerWsModule()

> **registerWsModule**(): `void`

Defined in: packages/core/nest-application.ts:163

#### Returns

`void`

***

### resolve()

Resolves transient or request-scoped instance (or a list of instances) of either injectable or controller, otherwise, throws exception.

#### Call Signature

> **resolve**\<`TInput`, `TResult`\>(`typeOrToken`): `Promise`\<`TResult`\>

Defined in: packages/core/nest-application-context.ts:180

Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

##### Returns

`Promise`\<`TResult`\>

##### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`resolve`](../../common/interfaces/INestApplication.md#resolve)

##### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`resolve`](NestApplicationContext.md#resolve)

#### Call Signature

> **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`): `Promise`\<`TResult`\>

Defined in: packages/core/nest-application-context.ts:187

Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

###### contextId?

###### id

`number`

##### Returns

`Promise`\<`TResult`\>

##### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`resolve`](../../common/interfaces/INestApplication.md#resolve)

##### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`resolve`](NestApplicationContext.md#resolve)

#### Call Signature

> **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`, `options?`): `Promise`\<`TResult`\>

Defined in: packages/core/nest-application-context.ts:197

Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

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

##### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`resolve`](../../common/interfaces/INestApplication.md#resolve)

##### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`resolve`](NestApplicationContext.md#resolve)

#### Call Signature

> **resolve**\<`TInput`, `TResult`\>(`typeOrToken`, `contextId?`, `options?`): `Promise`\<`TResult`[]\>

Defined in: packages/core/nest-application-context.ts:211

Resolves transient or request-scoped instances of either injectables or controllers, otherwise, throws exception.

##### Type Parameters

###### TInput

`TInput` = `any`

###### TResult

`TResult` = `TInput`

##### Parameters

###### typeOrToken

`string` | `symbol` | `Function` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\>

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

##### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`resolve`](../../common/interfaces/INestApplication.md#resolve)

##### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`resolve`](NestApplicationContext.md#resolve)

***

### resolvePerContext()

> `protected` **resolvePerContext**\<`TInput`, `TResult`\>(`typeOrToken`, `contextModule`, `contextId`, `options?`): `Promise`\<`TResult` \| `TResult`[]\>

Defined in: packages/core/injector/abstract-instance-resolver.ts:44

#### Type Parameters

##### TInput

`TInput` = `any`

##### TResult

`TResult` = `TInput`

#### Parameters

##### typeOrToken

`string` | `symbol` | [`Type`](../../common/interfaces/Type.md)\<`TInput`\> | [`Abstract`](../../common/interfaces/Abstract.md)\<`TInput`\>

##### contextModule

`Module`

##### contextId

[`ContextId`](../interfaces/ContextId.md)

##### options?

`GetOrResolveOptions`

#### Returns

`Promise`\<`TResult` \| `TResult`[]\>

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`resolvePerContext`](NestApplicationContext.md#resolvepercontext)

***

### select()

> **select**\<`T`\>(`moduleType`, `selectOptions?`): [`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md)

Defined in: packages/core/nest-application-context.ts:91

Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.

#### Type Parameters

##### T

`T`

#### Parameters

##### moduleType

[`DynamicModule`](../../common/interfaces/DynamicModule.md) | [`Type`](../../common/interfaces/Type.md)\<`T`\>

##### selectOptions?

`SelectOptions`

#### Returns

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md)

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`select`](../../common/interfaces/INestApplication.md#select)

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`select`](NestApplicationContext.md#select)

***

### selectContextModule()

> **selectContextModule**(): `void`

Defined in: packages/core/nest-application-context.ts:82

#### Returns

`void`

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`selectContextModule`](NestApplicationContext.md#selectcontextmodule)

***

### setBaseViewsDir()

> **setBaseViewsDir**(`path`): `this`

Defined in: packages/core/nest-application.ts:448

#### Parameters

##### path

`string` | `string`[]

#### Returns

`this`

***

### setGlobalPrefix()

> **setGlobalPrefix**(`prefix`, `options?`): `this`

Defined in: packages/core/nest-application.ts:377

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

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`setGlobalPrefix`](../../common/interfaces/INestApplication.md#setglobalprefix)

***

### setViewEngine()

> **setViewEngine**(`engineOrOptions`): `this`

Defined in: packages/core/nest-application.ts:453

#### Parameters

##### engineOrOptions

`any`

#### Returns

`this`

***

### startAllMicroservices()

> **startAllMicroservices**(): `Promise`\<`NestApplication`\>

Defined in: packages/core/nest-application.ts:257

Starts all connected microservices asynchronously.

#### Returns

`Promise`\<`NestApplication`\>

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`startAllMicroservices`](../../common/interfaces/INestApplication.md#startallmicroservices)

***

### unsubscribeFromProcessSignals()

> `protected` **unsubscribeFromProcessSignals**(): `void`

Defined in: packages/core/nest-application-context.ts:392

Unsubscribes from shutdown signals (process events)

#### Returns

`void`

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`unsubscribeFromProcessSignals`](NestApplicationContext.md#unsubscribefromprocesssignals)

***

### use()

> **use**(...`args`): `this`

Defined in: packages/core/nest-application.ts:263

A wrapper function around HTTP adapter method: `adapter.use()`.
Example `app.use(cors())`

#### Parameters

##### args

...\[`any`, `any`?\]

#### Returns

`this`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`use`](../../common/interfaces/INestApplication.md#use)

***

### useBodyParser()

> **useBodyParser**(...`args`): `this`

Defined in: packages/core/nest-application.ts:268

#### Parameters

##### args

...\[`any`, `any`?\]

#### Returns

`this`

***

### useGlobalFilters()

> **useGlobalFilters**(...`filters`): `this`

Defined in: packages/core/nest-application.ts:396

Registers exception filters as global filters (will be used within
every HTTP route handler)

#### Parameters

##### filters

...[`ExceptionFilter`](../../common/interfaces/ExceptionFilter.md)\<`any`\>[]

#### Returns

`this`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`useGlobalFilters`](../../common/interfaces/INestApplication.md#useglobalfilters)

***

### useGlobalGuards()

> **useGlobalGuards**(...`guards`): `this`

Defined in: packages/core/nest-application.ts:429

Registers guards as global guards (will be used within every HTTP route handler)

#### Parameters

##### guards

...[`CanActivate`](../../common/interfaces/CanActivate.md)[]

#### Returns

`this`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`useGlobalGuards`](../../common/interfaces/INestApplication.md#useglobalguards)

***

### useGlobalInterceptors()

> **useGlobalInterceptors**(...`interceptors`): `this`

Defined in: packages/core/nest-application.ts:418

Registers interceptors as global interceptors (will be used within
every HTTP route handler)

#### Parameters

##### interceptors

...[`NestInterceptor`](../../common/interfaces/NestInterceptor.md)\<`any`, `any`\>[]

#### Returns

`this`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`useGlobalInterceptors`](../../common/interfaces/INestApplication.md#useglobalinterceptors)

***

### useGlobalPipes()

> **useGlobalPipes**(...`pipes`): `this`

Defined in: packages/core/nest-application.ts:407

Registers pipes as global pipes (will be used within every HTTP route handler)

#### Parameters

##### pipes

...[`PipeTransform`](../../common/interfaces/PipeTransform.md)\<`any`, `any`\>[]

#### Returns

`this`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`useGlobalPipes`](../../common/interfaces/INestApplication.md#useglobalpipes)

***

### useLogger()

> **useLogger**(`logger`): `void`

Defined in: packages/core/nest-application-context.ts:290

Sets custom logger service.
Flushes buffered logs if auto flush is on.

#### Parameters

##### logger

`false` | [`LoggerService`](../../common/interfaces/LoggerService.md) | (`"verbose"` \| `"debug"` \| `"log"` \| `"warn"` \| `"error"` \| `"fatal"`)[]

#### Returns

`void`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`useLogger`](../../common/interfaces/INestApplication.md#uselogger)

#### Inherited from

[`NestApplicationContext`](NestApplicationContext.md).[`useLogger`](NestApplicationContext.md#uselogger)

***

### useStaticAssets()

#### Call Signature

> **useStaticAssets**(`options`): `this`

Defined in: packages/core/nest-application.ts:440

##### Parameters

###### options

`any`

##### Returns

`this`

#### Call Signature

> **useStaticAssets**(`path`, `options?`): `this`

Defined in: packages/core/nest-application.ts:441

##### Parameters

###### path

`string`

###### options?

`any`

##### Returns

`this`

***

### useWebSocketAdapter()

> **useWebSocketAdapter**(`adapter`): `this`

Defined in: packages/core/nest-application.ts:391

Register Ws Adapter which will be used inside Gateways.
Use when you want to override default `socket.io` library.

#### Parameters

##### adapter

[`WebSocketAdapter`](../../common/interfaces/WebSocketAdapter.md)

#### Returns

`this`

#### Implementation of

[`INestApplication`](../../common/interfaces/INestApplication.md).[`useWebSocketAdapter`](../../common/interfaces/INestApplication.md#usewebsocketadapter)
