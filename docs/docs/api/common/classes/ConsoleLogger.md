# Class: ConsoleLogger

Defined in: packages/common/services/console-logger.service.ts:122

## Public Api

## Implements

- [`LoggerService`](../interfaces/LoggerService.md)

## Constructors

### Constructor

> **new ConsoleLogger**(): `ConsoleLogger`

Defined in: packages/common/services/console-logger.service.ts:144

#### Returns

`ConsoleLogger`

### Constructor

> **new ConsoleLogger**(`context`): `ConsoleLogger`

Defined in: packages/common/services/console-logger.service.ts:145

#### Parameters

##### context

`string`

#### Returns

`ConsoleLogger`

### Constructor

> **new ConsoleLogger**(`options`): `ConsoleLogger`

Defined in: packages/common/services/console-logger.service.ts:146

#### Parameters

##### options

[`ConsoleLoggerOptions`](../interfaces/ConsoleLoggerOptions.md)

#### Returns

`ConsoleLogger`

### Constructor

> **new ConsoleLogger**(`context`, `options`): `ConsoleLogger`

Defined in: packages/common/services/console-logger.service.ts:147

#### Parameters

##### context

`string`

##### options

[`ConsoleLoggerOptions`](../interfaces/ConsoleLoggerOptions.md)

#### Returns

`ConsoleLogger`

## Properties

### context?

> `protected` `optional` **context**: `string`

Defined in: packages/common/services/console-logger.service.ts:130

The context of the logger (can be set manually or automatically inferred).

***

### inspectOptions

> `protected` **inspectOptions**: `InspectOptions`

Defined in: packages/common/services/console-logger.service.ts:138

The options used for the "inspect" method.

***

### options

> `protected` **options**: [`ConsoleLoggerOptions`](../interfaces/ConsoleLoggerOptions.md)

Defined in: packages/common/services/console-logger.service.ts:126

The options of the logger.

***

### originalContext?

> `protected` `optional` **originalContext**: `string`

Defined in: packages/common/services/console-logger.service.ts:134

The original context of the logger (set in the constructor).

***

### lastTimestampAt?

> `protected` `static` `optional` **lastTimestampAt**: `number`

Defined in: packages/common/services/console-logger.service.ts:142

The last timestamp at which the log message was printed.

## Methods

### colorize()

> `protected` **colorize**(`message`, `logLevel`): `string`

Defined in: packages/common/services/console-logger.service.ts:470

#### Parameters

##### message

`string`

##### logLevel

`"verbose"` | `"debug"` | `"log"` | `"warn"` | `"error"` | `"fatal"`

#### Returns

`string`

***

### debug()

#### Call Signature

> **debug**(`message`, `context?`): `void`

Defined in: packages/common/services/console-logger.service.ts:231

Write a 'debug' level log, if the configured level allows for it.
Prints to `stdout` with newline.

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

Defined in: packages/common/services/console-logger.service.ts:232

Write a 'debug' level log, if the configured level allows for it.
Prints to `stdout` with newline.

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

> **error**(`message`, `stackOrContext?`): `void`

Defined in: packages/common/services/console-logger.service.ts:196

Write an 'error' level log, if the configured level allows for it.
Prints to `stderr` with newline.

##### Parameters

###### message

`any`

###### stackOrContext?

`string`

##### Returns

`void`

##### Implementation of

[`LoggerService`](../interfaces/LoggerService.md).[`error`](../interfaces/LoggerService.md#error)

#### Call Signature

> **error**(`message`, `stack?`, `context?`): `void`

Defined in: packages/common/services/console-logger.service.ts:197

Write an 'error' level log, if the configured level allows for it.
Prints to `stderr` with newline.

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

`LoggerService.error`

#### Call Signature

> **error**(`message`, ...`optionalParams`): `void`

Defined in: packages/common/services/console-logger.service.ts:198

Write an 'error' level log, if the configured level allows for it.
Prints to `stderr` with newline.

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

Defined in: packages/common/services/console-logger.service.ts:265

Write a 'fatal' level log, if the configured level allows for it.
Prints to `stdout` with newline.

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

Defined in: packages/common/services/console-logger.service.ts:266

Write a 'fatal' level log, if the configured level allows for it.
Prints to `stdout` with newline.

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

### formatContext()

> `protected` **formatContext**(`context`): `string`

Defined in: packages/common/services/console-logger.service.ts:421

#### Parameters

##### context

`string`

#### Returns

`string`

***

### formatMessage()

> `protected` **formatMessage**(`logLevel`, `message`, `pidMessage`, `formattedLogLevel`, `contextMessage`, `timestampDiff`): `string`

Defined in: packages/common/services/console-logger.service.ts:430

#### Parameters

##### logLevel

`"verbose"` | `"debug"` | `"log"` | `"warn"` | `"error"` | `"fatal"`

##### message

`unknown`

##### pidMessage

`string`

##### formattedLogLevel

`string`

##### contextMessage

`string`

##### timestampDiff

`string`

#### Returns

`string`

***

### formatPid()

> `protected` **formatPid**(`pid`): `string`

Defined in: packages/common/services/console-logger.service.ts:417

#### Parameters

##### pid

`number`

#### Returns

`string`

***

### formatTimestampDiff()

> `protected` **formatTimestampDiff**(`timestampDiff`): `string`

Defined in: packages/common/services/console-logger.service.ts:499

#### Parameters

##### timestampDiff

`number`

#### Returns

`string`

***

### getInspectOptions()

> `protected` **getInspectOptions**(): `InspectOptions`

Defined in: packages/common/services/console-logger.service.ts:504

#### Returns

`InspectOptions`

***

### getJsonLogObject()

> `protected` **getJsonLogObject**(`message`, `options`): `JsonLogObject`

Defined in: packages/common/services/console-logger.service.ts:382

#### Parameters

##### message

`unknown`

##### options

###### context

`string`

###### errorStack?

`unknown`

###### logLevel

`"verbose"` \| `"debug"` \| `"log"` \| `"warn"` \| `"error"` \| `"fatal"`

###### writeStreamType?

`"stdout"` \| `"stderr"`

#### Returns

`JsonLogObject`

***

### getTimestamp()

> `protected` **getTimestamp**(): `string`

Defined in: packages/common/services/console-logger.service.ts:309

#### Returns

`string`

***

### isLevelEnabled()

> **isLevelEnabled**(`level`): `boolean`

Defined in: packages/common/services/console-logger.service.ts:304

#### Parameters

##### level

`"verbose"` | `"debug"` | `"log"` | `"warn"` | `"error"` | `"fatal"`

#### Returns

`boolean`

***

### log()

#### Call Signature

> **log**(`message`, `context?`): `void`

Defined in: packages/common/services/console-logger.service.ts:179

Write a 'log' level log, if the configured level allows for it.
Prints to `stdout` with newline.

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

Defined in: packages/common/services/console-logger.service.ts:180

Write a 'log' level log, if the configured level allows for it.
Prints to `stdout` with newline.

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

### printAsJson()

> `protected` **printAsJson**(`message`, `options`): `void`

Defined in: packages/common/services/console-logger.service.ts:355

#### Parameters

##### message

`unknown`

##### options

###### context

`string`

###### errorStack?

`unknown`

###### logLevel

`"verbose"` \| `"debug"` \| `"log"` \| `"warn"` \| `"error"` \| `"fatal"`

###### writeStreamType?

`"stdout"` \| `"stderr"`

#### Returns

`void`

***

### printMessages()

> `protected` **printMessages**(`messages`, `context`, `logLevel`, `writeStreamType?`, `errorStack?`): `void`

Defined in: packages/common/services/console-logger.service.ts:313

#### Parameters

##### messages

`unknown`[]

##### context

`string` = `''`

##### logLevel

`"verbose"` | `"debug"` | `"log"` | `"warn"` | `"error"` | `"fatal"`

##### writeStreamType?

`"stdout"` | `"stderr"`

##### errorStack?

`unknown`

#### Returns

`void`

***

### printStackTrace()

> `protected` **printStackTrace**(`stack`): `void`

Defined in: packages/common/services/console-logger.service.ts:478

#### Parameters

##### stack

`string`

#### Returns

`void`

***

### resetContext()

> **resetContext**(): `void`

Defined in: packages/common/services/console-logger.service.ts:300

Resets the logger context to the value that was passed in the constructor.

#### Returns

`void`

***

### setContext()

> **setContext**(`context`): `void`

Defined in: packages/common/services/console-logger.service.ts:293

Set logger context

#### Parameters

##### context

`string`

context

#### Returns

`void`

***

### setLogLevels()

> **setLogLevels**(`levels`): `void`

Defined in: packages/common/services/console-logger.service.ts:282

Set log levels

#### Parameters

##### levels

(`"verbose"` \| `"debug"` \| `"log"` \| `"warn"` \| `"error"` \| `"fatal"`)[]

log levels

#### Returns

`void`

#### Implementation of

[`LoggerService`](../interfaces/LoggerService.md).[`setLogLevels`](../interfaces/LoggerService.md#setloglevels)

***

### stringifyMessage()

> `protected` **stringifyMessage**(`message`, `logLevel`): `any`

Defined in: packages/common/services/console-logger.service.ts:444

#### Parameters

##### message

`unknown`

##### logLevel

`"verbose"` | `"debug"` | `"log"` | `"warn"` | `"error"` | `"fatal"`

#### Returns

`any`

***

### stringifyReplacer()

> `protected` **stringifyReplacer**(`key`, `value`): `unknown`

Defined in: packages/common/services/console-logger.service.ts:535

#### Parameters

##### key

`string`

##### value

`unknown`

#### Returns

`unknown`

***

### updateAndGetTimestampDiff()

> `protected` **updateAndGetTimestampDiff**(): `string`

Defined in: packages/common/services/console-logger.service.ts:489

#### Returns

`string`

***

### verbose()

#### Call Signature

> **verbose**(`message`, `context?`): `void`

Defined in: packages/common/services/console-logger.service.ts:248

Write a 'verbose' level log, if the configured level allows for it.
Prints to `stdout` with newline.

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

Defined in: packages/common/services/console-logger.service.ts:249

Write a 'verbose' level log, if the configured level allows for it.
Prints to `stdout` with newline.

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

Defined in: packages/common/services/console-logger.service.ts:214

Write a 'warn' level log, if the configured level allows for it.
Prints to `stdout` with newline.

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

Defined in: packages/common/services/console-logger.service.ts:215

Write a 'warn' level log, if the configured level allows for it.
Prints to `stdout` with newline.

##### Parameters

###### message

`any`

###### optionalParams

...`any`[]

##### Returns

`void`

##### Implementation of

`LoggerService.warn`
