# Class: StreamableFile

Defined in: packages/common/file-stream/streamable-file.ts:13

## See

[Streaming files](https://docs.nestjs.com/techniques/streaming-files)

## Public Api

## Constructors

### Constructor

> **new StreamableFile**(`buffer`, `options?`): `StreamableFile`

Defined in: packages/common/file-stream/streamable-file.ts:37

#### Parameters

##### buffer

`Uint8Array`

##### options?

`StreamableFileOptions`

#### Returns

`StreamableFile`

### Constructor

> **new StreamableFile**(`readable`, `options?`): `StreamableFile`

Defined in: packages/common/file-stream/streamable-file.ts:38

#### Parameters

##### readable

`Readable`

##### options?

`StreamableFileOptions`

#### Returns

`StreamableFile`

## Properties

### handleError()

> `protected` **handleError**: (`err`, `response`) => `void`

Defined in: packages/common/file-stream/streamable-file.ts:17

#### Parameters

##### err

`Error`

##### response

`StreamableHandlerResponse`

#### Returns

`void`

***

### logError()

> `protected` **logError**: (`err`) => `void`

Defined in: packages/common/file-stream/streamable-file.ts:33

#### Parameters

##### err

`Error`

#### Returns

`void`

***

### logger

> `protected` **logger**: [`Logger`](Logger.md)

Defined in: packages/common/file-stream/streamable-file.ts:15

***

### options

> `readonly` **options**: `StreamableFileOptions` = `{}`

Defined in: packages/common/file-stream/streamable-file.ts:41

## Accessors

### errorHandler

#### Get Signature

> **get** **errorHandler**(): (`err`, `response`) => `void`

Defined in: packages/common/file-stream/streamable-file.ts:70

##### Returns

> (`err`, `response`): `void`

###### Parameters

###### err

`Error`

###### response

`StreamableHandlerResponse`

###### Returns

`void`

***

### errorLogger

#### Get Signature

> **get** **errorLogger**(): (`err`) => `void`

Defined in: packages/common/file-stream/streamable-file.ts:84

##### Returns

> (`err`): `void`

###### Parameters

###### err

`Error`

###### Returns

`void`

## Methods

### getHeaders()

> **getHeaders**(): `object`

Defined in: packages/common/file-stream/streamable-file.ts:57

#### Returns

`object`

##### disposition

> **disposition**: `string` \| `string`[] \| `undefined`

##### length

> **length**: `number` \| `undefined`

##### type

> **type**: `string`

***

### getStream()

> **getStream**(): `Readable`

Defined in: packages/common/file-stream/streamable-file.ts:53

#### Returns

`Readable`

***

### setErrorHandler()

> **setErrorHandler**(`handler`): `StreamableFile`

Defined in: packages/common/file-stream/streamable-file.ts:77

#### Parameters

##### handler

(`err`, `response`) => `void`

#### Returns

`StreamableFile`

***

### setErrorLogger()

> **setErrorLogger**(`handler`): `StreamableFile`

Defined in: packages/common/file-stream/streamable-file.ts:88

#### Parameters

##### handler

(`err`) => `void`

#### Returns

`StreamableFile`
