# Interface: LoggerService

Defined in: packages/common/services/logger.service.ts:23

## Public Api

## Methods

### debug()?

> `optional` **debug**(`message`, ...`optionalParams`): `any`

Defined in: packages/common/services/logger.service.ts:42

Write a 'debug' level log.

#### Parameters

##### message

`any`

##### optionalParams

...`any`[]

#### Returns

`any`

***

### error()

> **error**(`message`, ...`optionalParams`): `any`

Defined in: packages/common/services/logger.service.ts:32

Write an 'error' level log.

#### Parameters

##### message

`any`

##### optionalParams

...`any`[]

#### Returns

`any`

***

### fatal()?

> `optional` **fatal**(`message`, ...`optionalParams`): `any`

Defined in: packages/common/services/logger.service.ts:52

Write a 'fatal' level log.

#### Parameters

##### message

`any`

##### optionalParams

...`any`[]

#### Returns

`any`

***

### log()

> **log**(`message`, ...`optionalParams`): `any`

Defined in: packages/common/services/logger.service.ts:27

Write a 'log' level log.

#### Parameters

##### message

`any`

##### optionalParams

...`any`[]

#### Returns

`any`

***

### setLogLevels()?

> `optional` **setLogLevels**(`levels`): `any`

Defined in: packages/common/services/logger.service.ts:58

Set log levels.

#### Parameters

##### levels

(`"verbose"` \| `"debug"` \| `"log"` \| `"warn"` \| `"error"` \| `"fatal"`)[]

log levels

#### Returns

`any`

***

### verbose()?

> `optional` **verbose**(`message`, ...`optionalParams`): `any`

Defined in: packages/common/services/logger.service.ts:47

Write a 'verbose' level log.

#### Parameters

##### message

`any`

##### optionalParams

...`any`[]

#### Returns

`any`

***

### warn()

> **warn**(`message`, ...`optionalParams`): `any`

Defined in: packages/common/services/logger.service.ts:37

Write a 'warn' level log.

#### Parameters

##### message

`any`

##### optionalParams

...`any`[]

#### Returns

`any`
