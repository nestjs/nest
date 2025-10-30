# Class: NestApplicationContext\<TOptions\>

Defined in: packages/core/nest-application-context.ts:39

## Public Api

## Extends

- `AbstractInstanceResolver`

## Extended by

- [`NestApplication`](NestApplication.md)

## Type Parameters

### TOptions

`TOptions` *extends* `NestApplicationContextOptions` = `NestApplicationContextOptions`

## Implements

- [`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md)

## Constructors

### Constructor

> **new NestApplicationContext**\<`TOptions`\>(`container`, `appOptions`, `contextModule`, `scope`): `NestApplicationContext`\<`TOptions`\>

Defined in: packages/core/nest-application-context.ts:67

#### Parameters

##### container

[`NestContainer`](NestContainer.md)

##### appOptions

`TOptions` = `...`

##### contextModule

`Module` | `null`

##### scope

[`Type`](../../common/interfaces/Type.md)\<`any`\>[] = `...`

#### Returns

`NestApplicationContext`\<`TOptions`\>

#### Overrides

`AbstractInstanceResolver.constructor`

## Properties

### appOptions

> `protected` `readonly` **appOptions**: `TOptions`

Defined in: packages/core/nest-application-context.ts:69

***

### container

> `protected` `readonly` **container**: [`NestContainer`](NestContainer.md)

Defined in: packages/core/nest-application-context.ts:68

***

### injector

> `protected` **injector**: `Injector`

Defined in: packages/core/nest-application-context.ts:47

#### Overrides

`AbstractInstanceResolver.injector`

***

### isInitialized

> `protected` **isInitialized**: `boolean` = `false`

Defined in: packages/core/nest-application-context.ts:46

***

### logger

> `protected` `readonly` **logger**: [`Logger`](../../common/classes/Logger.md)

Defined in: packages/core/nest-application-context.ts:48

## Accessors

### instanceLinksHost

#### Get Signature

> **get** `protected` **instanceLinksHost**(): `InstanceLinksHost`

Defined in: packages/core/nest-application-context.ts:60

##### Returns

`InstanceLinksHost`

#### Overrides

`AbstractInstanceResolver.instanceLinksHost`

## Methods

### assertNotInPreviewMode()

> `protected` **assertNotInPreviewMode**(`methodName`): `void`

Defined in: packages/core/nest-application-context.ts:465

#### Parameters

##### methodName

`string`

#### Returns

`void`

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

***

### callBootstrapHook()

> `protected` **callBootstrapHook**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application-context.ts:430

Calls the `onApplicationBootstrap` function on the registered
modules and its children.

#### Returns

`Promise`\<`void`\>

***

### callDestroyHook()

> `protected` **callDestroyHook**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application-context.ts:416

Calls the `onModuleDestroy` function on the registered
modules and its children.

#### Returns

`Promise`\<`void`\>

***

### callInitHook()

> `protected` **callInitHook**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application-context.ts:405

Calls the `onModuleInit` function on the registered
modules and its children.

#### Returns

`Promise`\<`void`\>

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`close`](../../common/interfaces/INestApplicationContext.md#close)

***

### dispose()

> `protected` **dispose**(): `Promise`\<`void`\>

Defined in: packages/core/nest-application-context.ts:343

#### Returns

`Promise`\<`void`\>

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`enableShutdownHooks`](../../common/interfaces/INestApplicationContext.md#enableshutdownhooks)

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

`AbstractInstanceResolver.find`

***

### flushLogs()

> **flushLogs**(): `void`

Defined in: packages/core/nest-application-context.ts:302

Prints buffered logs and detaches buffer.

#### Returns

`void`

#### Implementation of

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`flushLogs`](../../common/interfaces/INestApplicationContext.md#flushlogs)

***

### flushLogsOnOverride()

> **flushLogsOnOverride**(): `void`

Defined in: packages/core/nest-application-context.ts:309

Define that it must flush logs right after defining a custom logger.

#### Returns

`void`

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`get`](../../common/interfaces/INestApplicationContext.md#get)

##### Overrides

`AbstractInstanceResolver.get`

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`get`](../../common/interfaces/INestApplicationContext.md#get)

##### Overrides

`AbstractInstanceResolver.get`

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`get`](../../common/interfaces/INestApplicationContext.md#get)

##### Overrides

`AbstractInstanceResolver.get`

***

### init()

> **init**(): `Promise`\<`NestApplicationContext`\<`TOptions`\>\>

Defined in: packages/core/nest-application-context.ts:252

Initializes the Nest application.
Calls the Nest lifecycle events.

#### Returns

`Promise`\<`NestApplicationContext`\<`TOptions`\>\>

The NestApplicationContext instance as Promise

#### Implementation of

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`init`](../../common/interfaces/INestApplicationContext.md#init)

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`registerRequestByContextId`](../../common/interfaces/INestApplicationContext.md#registerrequestbycontextid)

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`resolve`](../../common/interfaces/INestApplicationContext.md#resolve)

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`resolve`](../../common/interfaces/INestApplicationContext.md#resolve)

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`resolve`](../../common/interfaces/INestApplicationContext.md#resolve)

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`resolve`](../../common/interfaces/INestApplicationContext.md#resolve)

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

`AbstractInstanceResolver.resolvePerContext`

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`select`](../../common/interfaces/INestApplicationContext.md#select)

***

### selectContextModule()

> **selectContextModule**(): `void`

Defined in: packages/core/nest-application-context.ts:82

#### Returns

`void`

***

### unsubscribeFromProcessSignals()

> `protected` **unsubscribeFromProcessSignals**(): `void`

Defined in: packages/core/nest-application-context.ts:392

Unsubscribes from shutdown signals (process events)

#### Returns

`void`

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

[`INestApplicationContext`](../../common/interfaces/INestApplicationContext.md).[`useLogger`](../../common/interfaces/INestApplicationContext.md#uselogger)
