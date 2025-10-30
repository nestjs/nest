# Interface: NestApplicationOptions

Defined in: packages/common/interfaces/nest-application-options.interface.ts:11

## Public Api

## Extends

- `NestApplicationContextOptions`

## Properties

### abortOnError?

> `optional` **abortOnError**: `boolean`

Defined in: packages/common/interfaces/nest-application-context-options.interface.ts:18

Whether to abort the process on Error. By default, the process is exited.
Pass `false` to override the default behavior. If `false` is passed, Nest will not exit
the application and instead will rethrow the exception.

#### Default

```ts
true
```

#### Inherited from

`NestApplicationContextOptions.abortOnError`

***

### autoFlushLogs?

> `optional` **autoFlushLogs**: `boolean`

Defined in: packages/common/interfaces/nest-application-context-options.interface.ts:31

If enabled, logs will be automatically flushed and buffer detached when
application initialization process either completes or fails.

#### Default

```ts
true
```

#### Inherited from

`NestApplicationContextOptions.autoFlushLogs`

***

### bodyParser?

> `optional` **bodyParser**: `boolean`

Defined in: packages/common/interfaces/nest-application-options.interface.ts:19

Whether to use underlying platform body parser.

***

### bufferLogs?

> `optional` **bufferLogs**: `boolean`

Defined in: packages/common/interfaces/nest-application-context-options.interface.ts:24

If enabled, logs will be buffered until the "Logger#flush" method is called.

#### Default

```ts
false
```

#### Inherited from

`NestApplicationContextOptions.bufferLogs`

***

### cors?

> `optional` **cors**: `boolean` \| `CorsOptions` \| `CorsOptionsDelegate`\<`any`\>

Defined in: packages/common/interfaces/nest-application-options.interface.ts:15

CORS options from [CORS package](https://github.com/expressjs/cors#configuration-options)

***

### forceCloseConnections?

> `optional` **forceCloseConnections**: `boolean`

Defined in: packages/common/interfaces/nest-application-options.interface.ts:32

Force close open HTTP connections. Useful if restarting your application hangs due to
keep-alive connections in the HTTP adapter.

***

### forceConsole?

> `optional` **forceConsole**: `boolean`

Defined in: packages/common/interfaces/nest-application-context-options.interface.ts:76

If enabled, will force the use of console.log/console.error instead of process.stdout/stderr.write
in the default ConsoleLogger. This is useful for test environments like Jest that can buffer console calls.

#### Default

```ts
false
```

#### Inherited from

`NestApplicationContextOptions.forceConsole`

***

### httpsOptions?

> `optional` **httpsOptions**: `HttpsOptions`

Defined in: packages/common/interfaces/nest-application-options.interface.ts:23

Set of configurable HTTPS options

***

### instrument?

> `optional` **instrument**: `object`

Defined in: packages/common/interfaces/nest-application-context-options.interface.ts:61

Instrument the application context.
This option allows you to add custom instrumentation to the application context.

#### instanceDecorator()

> **instanceDecorator**: (`instance`) => `unknown`

Function that decorates each instance created by the application context.
This function can be used to add custom properties or methods to the instance.

##### Parameters

###### instance

`unknown`

The instance to decorate.

##### Returns

`unknown`

The decorated instance.

#### Inherited from

`NestApplicationContextOptions.instrument`

***

### logger?

> `optional` **logger**: `false` \| [`LoggerService`](LoggerService.md) \| (`"verbose"` \| `"debug"` \| `"log"` \| `"warn"` \| `"error"` \| `"fatal"`)[]

Defined in: packages/common/interfaces/nest-application-context-options.interface.ts:10

Specifies the logger to use.  Pass `false` to turn off logging.

#### Inherited from

`NestApplicationContextOptions.logger`

***

### moduleIdGeneratorAlgorithm?

> `optional` **moduleIdGeneratorAlgorithm**: `"deep-hash"` \| `"reference"`

Defined in: packages/common/interfaces/nest-application-context-options.interface.ts:55

Determines what algorithm use to generate module ids.
When set to `deep-hash`, the module id is generated based on the serialized module definition.
When set to `reference`, each module obtains a unique id based on its reference.

#### Default

```ts
'reference'
```

#### Inherited from

`NestApplicationContextOptions.moduleIdGeneratorAlgorithm`

***

### preview?

> `optional` **preview**: `boolean`

Defined in: packages/common/interfaces/nest-application-context-options.interface.ts:39

Whether to run application in the preview mode.
In the preview mode, providers/controllers are not instantiated & resolved.

#### Default

```ts
false
```

#### Inherited from

`NestApplicationContextOptions.preview`

***

### rawBody?

> `optional` **rawBody**: `boolean`

Defined in: packages/common/interfaces/nest-application-options.interface.ts:27

Whether to register the raw request body on the request. Use `req.rawBody`.

***

### snapshot?

> `optional` **snapshot**: `boolean`

Defined in: packages/common/interfaces/nest-application-context-options.interface.ts:46

Whether to generate a serialized graph snapshot.

#### Default

```ts
false
```

#### Inherited from

`NestApplicationContextOptions.snapshot`
