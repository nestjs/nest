# Interface: INestApplicationContext

Defined in: packages/common/interfaces/nest-application-context.interface.ts:28

Interface defining NestApplicationContext.

## Public Api

## Extended by

- [`INestApplication`](INestApplication.md)
- [`INestMicroservice`](INestMicroservice.md)

## Methods

### close()

> **close**(): `Promise`\<`void`\>

Defined in: packages/common/interfaces/nest-application-context.interface.ts:126

Terminates the application

#### Returns

`Promise`\<`void`\>

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

***

### flushLogs()

> **flushLogs**(): `void`

Defined in: packages/common/interfaces/nest-application-context.interface.ts:139

Prints buffered logs and detaches buffer.

#### Returns

`void`

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

***

### init()

> **init**(): `Promise`\<`INestApplicationContext`\>

Defined in: packages/common/interfaces/nest-application-context.interface.ts:157

Initializes the Nest application.
Calls the Nest lifecycle events.
It isn't mandatory to call this method directly.

#### Returns

`Promise`\<`INestApplicationContext`\>

The NestApplicationContext instance as Promise

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

***

### select()

> **select**\<`T`\>(`module`, `options?`): `INestApplicationContext`

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

`INestApplicationContext`

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
