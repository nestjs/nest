# Class: Logger

Defined in: packages/common/services/logger.service.ts:88

## Public Api

## Implements

- [`LoggerService`](../interfaces/LoggerService.md)

## Constructors

### Constructor

> **new Logger**(): `Logger`

Defined in: packages/common/services/logger.service.ts:114

#### Returns

`Logger`

### Constructor

> **new Logger**(`context`): `Logger`

Defined in: packages/common/services/logger.service.ts:115

#### Parameters

##### context

`string`

#### Returns

`Logger`

### Constructor

> **new Logger**(`context`, `options?`): `Logger`

Defined in: packages/common/services/logger.service.ts:116

#### Parameters

##### context

`string`

##### options?

###### timestamp?

`boolean`

#### Returns

`Logger`

## Properties

### context?

> `protected` `optional` **context**: `string`

Defined in: packages/common/services/logger.service.ts:118

***

### localInstanceRef?

> `protected` `optional` **localInstanceRef**: [`LoggerService`](../interfaces/LoggerService.md)

Defined in: packages/common/services/logger.service.ts:94

***

### options

> `protected` **options**: `object` = `{}`

Defined in: packages/common/services/logger.service.ts:119

#### timestamp?

> `optional` **timestamp**: `boolean`

***

### logBuffer

> `protected` `static` **logBuffer**: `LogBufferRecord`[]

Defined in: packages/common/services/logger.service.ts:89

***

### logLevels?

> `protected` `static` `optional` **logLevels**: (`"verbose"` \| `"debug"` \| `"log"` \| `"warn"` \| `"error"` \| `"fatal"`)[]

Defined in: packages/common/services/logger.service.ts:91

***

### staticInstanceRef?

> `protected` `static` `optional` **staticInstanceRef**: [`LoggerService`](../interfaces/LoggerService.md) = `DEFAULT_LOGGER`

Defined in: packages/common/services/logger.service.ts:90

## Accessors

### localInstance

#### Get Signature

> **get** **localInstance**(): [`LoggerService`](../interfaces/LoggerService.md)

Defined in: packages/common/services/logger.service.ts:122

##### Returns

[`LoggerService`](../interfaces/LoggerService.md)

## Methods

### debug()

#### Call Signature

> **debug**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:179

Write a 'debug' level log.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

##### Implementation of

[`LoggerService`](../interfaces/LoggerService.md).[`debug`](../interfaces/LoggerService.md#debug)

#### Call Signature

> **debug**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:180

Write a 'debug' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

##### Implementation of

`LoggerService.debug`

***

### error()

#### Call Signature

> **error**(`message`, `stack?`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:137

Write an 'error' level log.

##### Parameters

###### message

`any`

###### stack?

`string`

###### context?

`string`

##### Returns

`void`

##### Implementation of

[`LoggerService`](../interfaces/LoggerService.md).[`error`](../interfaces/LoggerService.md#error)

#### Call Signature

> **error**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:138

Write an 'error' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

##### Implementation of

`LoggerService.error`

***

### fatal()

#### Call Signature

> **fatal**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:205

Write a 'fatal' level log.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

##### Implementation of

[`LoggerService`](../interfaces/LoggerService.md).[`fatal`](../interfaces/LoggerService.md#fatal)

#### Call Signature

> **fatal**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:206

Write a 'fatal' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

##### Implementation of

`LoggerService.fatal`

***

### log()

#### Call Signature

> **log**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:153

Write a 'log' level log.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

##### Implementation of

[`LoggerService`](../interfaces/LoggerService.md).[`log`](../interfaces/LoggerService.md#log)

#### Call Signature

> **log**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:154

Write a 'log' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

##### Implementation of

`LoggerService.log`

***

### verbose()

#### Call Signature

> **verbose**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:192

Write a 'verbose' level log.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

##### Implementation of

[`LoggerService`](../interfaces/LoggerService.md).[`verbose`](../interfaces/LoggerService.md#verbose)

#### Call Signature

> **verbose**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:193

Write a 'verbose' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

##### Implementation of

`LoggerService.verbose`

***

### warn()

#### Call Signature

> **warn**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:166

Write a 'warn' level log.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

##### Implementation of

[`LoggerService`](../interfaces/LoggerService.md).[`warn`](../interfaces/LoggerService.md#warn)

#### Call Signature

> **warn**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:167

Write a 'warn' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

##### Implementation of

`LoggerService.warn`

***

### attachBuffer()

> `static` **attachBuffer**(): `void`

Defined in: packages/common/services/logger.service.ts:296

Attach buffer.
Turns on initialization logs buffering.

#### Returns

`void`

***

### debug()

#### Call Signature

> `static` **debug**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:254

Write a 'debug' level log, if the configured level allows for it.
Prints to `stdout` with newline.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

#### Call Signature

> `static` **debug**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:255

Write a 'debug' level log, if the configured level allows for it.
Prints to `stdout` with newline.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

***

### detachBuffer()

> `static` **detachBuffer**(): `void`

Defined in: packages/common/services/logger.service.ts:304

Detach buffer.
Turns off initialization logs buffering.

#### Returns

`void`

***

### error()

#### Call Signature

> `static` **error**(`message`, `stackOrContext?`): `void`

Defined in: packages/common/services/logger.service.ts:218

Write an 'error' level log.

##### Parameters

###### message

`any`

###### stackOrContext?

`string`

##### Returns

`void`

#### Call Signature

> `static` **error**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:219

Write an 'error' level log.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

#### Call Signature

> `static` **error**(`message`, `stack?`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:220

Write an 'error' level log.

##### Parameters

###### message

`any`

###### stack?

`string`

###### context?

`string`

##### Returns

`void`

#### Call Signature

> `static` **error**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:221

Write an 'error' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

***

### fatal()

#### Call Signature

> `static` **fatal**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:274

Write a 'fatal' level log.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

#### Call Signature

> `static` **fatal**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:275

Write a 'fatal' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

***

### flush()

> `static` **flush**(): `void`

Defined in: packages/common/services/logger.service.ts:284

Print buffered logs and detach buffer.

#### Returns

`void`

***

### getTimestamp()

> `static` **getTimestamp**(): `string`

Defined in: packages/common/services/logger.service.ts:308

#### Returns

`string`

***

### isLevelEnabled()

> `static` **isLevelEnabled**(`level`): `boolean`

Defined in: packages/common/services/logger.service.ts:329

#### Parameters

##### level

`"verbose"` | `"debug"` | `"log"` | `"warn"` | `"error"` | `"fatal"`

#### Returns

`boolean`

***

### log()

#### Call Signature

> `static` **log**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:233

Write a 'log' level log.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

#### Call Signature

> `static` **log**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:234

Write a 'log' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

***

### overrideLogger()

> `static` **overrideLogger**(`logger`): `any`

Defined in: packages/common/services/logger.service.ts:312

#### Parameters

##### logger

`boolean` | [`LoggerService`](../interfaces/LoggerService.md) | (`"verbose"` \| `"debug"` \| `"log"` \| `"warn"` \| `"error"` \| `"fatal"`)[]

#### Returns

`any`

***

### verbose()

#### Call Signature

> `static` **verbose**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:264

Write a 'verbose' level log.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

#### Call Signature

> `static` **verbose**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:265

Write a 'verbose' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

***

### warn()

#### Call Signature

> `static` **warn**(`message`, `context?`): `void`

Defined in: packages/common/services/logger.service.ts:243

Write a 'warn' level log.

##### Parameters

###### message

`any`

###### context?

`string`

##### Returns

`void`

#### Call Signature

> `static` **warn**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/logger.service.ts:244

Write a 'warn' level log.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`
