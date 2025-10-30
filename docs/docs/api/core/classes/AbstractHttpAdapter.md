# Abstract Class: AbstractHttpAdapter\<TServer, TRequest, TResponse\>

Defined in: packages/core/adapters/http-adapter.ts:8

## Public Api

## Type Parameters

### TServer

`TServer` = `any`

### TRequest

`TRequest` = `any`

### TResponse

`TResponse` = `any`

## Implements

- [`HttpServer`](../../common/interfaces/HttpServer.md)\<`TRequest`, `TResponse`\>

## Constructors

### Constructor

> **new AbstractHttpAdapter**\<`TServer`, `TRequest`, `TResponse`\>(`instance?`): `AbstractHttpAdapter`\<`TServer`, `TRequest`, `TResponse`\>

Defined in: packages/core/adapters/http-adapter.ts:19

#### Parameters

##### instance?

`any`

#### Returns

`AbstractHttpAdapter`\<`TServer`, `TRequest`, `TResponse`\>

## Properties

### httpServer

> `protected` **httpServer**: `TServer`

Defined in: packages/core/adapters/http-adapter.ts:14

***

### instance?

> `protected` `optional` **instance**: `any`

Defined in: packages/core/adapters/http-adapter.ts:19

***

### onRouteTriggered

> `protected` **onRouteTriggered**: (`requestMethod`, `path`) => `void` \| `undefined`

Defined in: packages/core/adapters/http-adapter.ts:15

## Methods

### all()

#### Call Signature

> **all**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:105

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`all`](../../common/interfaces/HttpServer.md#all)

#### Call Signature

> **all**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:106

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`all`](../../common/interfaces/HttpServer.md#all)

***

### appendHeader()

> `abstract` **appendHeader**(`response`, `name`, `value`): `any`

Defined in: packages/core/adapters/http-adapter.ts:180

#### Parameters

##### response

`any`

##### name

`string`

##### value

`string`

#### Returns

`any`

***

### applyVersionFilter()

> `abstract` **applyVersionFilter**(`handler`, `version`, `versioningOptions`): (`req`, `res`, `next`) => `Function`

Defined in: packages/core/adapters/http-adapter.ts:189

#### Parameters

##### handler

`Function`

##### version

`VersionValue`

##### versioningOptions

[`VersioningOptions`](../../common/type-aliases/VersioningOptions.md)

#### Returns

> (`req`, `res`, `next`): `Function`

##### Parameters

###### req

`TRequest`

###### res

`TResponse`

###### next

() => `void`

##### Returns

`Function`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`applyVersionFilter`](../../common/interfaces/HttpServer.md#applyversionfilter)

***

### close()

> `abstract` **close**(): `any`

Defined in: packages/core/adapters/http-adapter.ts:163

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`close`](../../common/interfaces/HttpServer.md#close)

***

### copy()

#### Call Signature

> **copy**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:81

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`copy`](../../common/interfaces/HttpServer.md#copy)

#### Call Signature

> **copy**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:82

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`copy`](../../common/interfaces/HttpServer.md#copy)

***

### createMiddlewareFactory()

> `abstract` **createMiddlewareFactory**(`requestMethod`): (`path`, `callback`) => `any` \| `Promise`\<(`path`, `callback`) => `any`\>

Defined in: packages/core/adapters/http-adapter.ts:183

#### Parameters

##### requestMethod

[`RequestMethod`](../../common/enumerations/RequestMethod.md)

#### Returns

(`path`, `callback`) => `any` \| `Promise`\<(`path`, `callback`) => `any`\>

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`createMiddlewareFactory`](../../common/interfaces/HttpServer.md#createmiddlewarefactory)

***

### delete()

#### Call Signature

> **delete**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:45

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`delete`](../../common/interfaces/HttpServer.md#delete)

#### Call Signature

> **delete**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:46

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`delete`](../../common/interfaces/HttpServer.md#delete)

***

### enableCors()

> `abstract` **enableCors**(`options?`, `prefix?`): `any`

Defined in: packages/core/adapters/http-adapter.ts:182

#### Parameters

##### options?

`any`

##### prefix?

`string`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`enableCors`](../../common/interfaces/HttpServer.md#enablecors)

***

### end()

> `abstract` **end**(`response`, `message?`): `any`

Defined in: packages/core/adapters/http-adapter.ts:172

#### Parameters

##### response

`any`

##### message?

`string`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`end`](../../common/interfaces/HttpServer.md#end)

***

### get()

#### Call Signature

> **get**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:27

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`get`](../../common/interfaces/HttpServer.md#get)

#### Call Signature

> **get**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:28

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`get`](../../common/interfaces/HttpServer.md#get)

***

### getHeader()

> `abstract` **getHeader**(`response`, `name`): `any`

Defined in: packages/core/adapters/http-adapter.ts:178

#### Parameters

##### response

`any`

##### name

`string`

#### Returns

`any`

***

### getHttpServer()

> **getHttpServer**(): `TServer`

Defined in: packages/core/adapters/http-adapter.ts:129

#### Returns

`TServer`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`getHttpServer`](../../common/interfaces/HttpServer.md#gethttpserver)

***

### getInstance()

> **getInstance**\<`T`\>(): `T`

Defined in: packages/core/adapters/http-adapter.ts:141

#### Type Parameters

##### T

`T` = `any`

#### Returns

`T`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`getInstance`](../../common/interfaces/HttpServer.md#getinstance)

***

### getOnRouteTriggered()

> **getOnRouteTriggered**(): (`requestMethod`, `path`) => `void` \| `undefined`

Defined in: packages/core/adapters/http-adapter.ts:155

#### Returns

(`requestMethod`, `path`) => `void` \| `undefined`

***

### getRequestHostname()

> `abstract` **getRequestHostname**(`request`): `any`

Defined in: packages/core/adapters/http-adapter.ts:167

#### Parameters

##### request

`any`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`getRequestHostname`](../../common/interfaces/HttpServer.md#getrequesthostname)

***

### getRequestMethod()

> `abstract` **getRequestMethod**(`request`): `any`

Defined in: packages/core/adapters/http-adapter.ts:168

#### Parameters

##### request

`any`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`getRequestMethod`](../../common/interfaces/HttpServer.md#getrequestmethod)

***

### getRequestUrl()

> `abstract` **getRequestUrl**(`request`): `any`

Defined in: packages/core/adapters/http-adapter.ts:169

#### Parameters

##### request

`any`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`getRequestUrl`](../../common/interfaces/HttpServer.md#getrequesturl)

***

### getType()

> `abstract` **getType**(): `string`

Defined in: packages/core/adapters/http-adapter.ts:188

#### Returns

`string`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`getType`](../../common/interfaces/HttpServer.md#gettype)

***

### head()

#### Call Signature

> **head**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:39

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`head`](../../common/interfaces/HttpServer.md#head)

#### Call Signature

> **head**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:40

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`head`](../../common/interfaces/HttpServer.md#head)

***

### init()

> **init**(): `Promise`\<`void`\>

Defined in: packages/core/adapters/http-adapter.ts:21

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`init`](../../common/interfaces/HttpServer.md#init)

***

### initHttpServer()

> `abstract` **initHttpServer**(`options`): `any`

Defined in: packages/core/adapters/http-adapter.ts:164

#### Parameters

##### options

[`NestApplicationOptions`](../../common/interfaces/NestApplicationOptions.md)

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`initHttpServer`](../../common/interfaces/HttpServer.md#inithttpserver)

***

### isHeadersSent()

> `abstract` **isHeadersSent**(`response`): `any`

Defined in: packages/core/adapters/http-adapter.ts:177

#### Parameters

##### response

`any`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`isHeadersSent`](../../common/interfaces/HttpServer.md#isheaderssent)

***

### listen()

#### Call Signature

> **listen**(`port`, `callback?`): `any`

Defined in: packages/core/adapters/http-adapter.ts:123

##### Parameters

###### port

`string` | `number`

###### callback?

() => `void`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`listen`](../../common/interfaces/HttpServer.md#listen)

#### Call Signature

> **listen**(`port`, `hostname`, `callback?`): `any`

Defined in: packages/core/adapters/http-adapter.ts:124

##### Parameters

###### port

`string` | `number`

###### hostname

`string`

###### callback?

() => `void`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`listen`](../../common/interfaces/HttpServer.md#listen)

***

### lock()

#### Call Signature

> **lock**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:93

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`lock`](../../common/interfaces/HttpServer.md#lock)

#### Call Signature

> **lock**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:94

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`lock`](../../common/interfaces/HttpServer.md#lock)

***

### mkcol()

#### Call Signature

> **mkcol**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:75

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`mkcol`](../../common/interfaces/HttpServer.md#mkcol)

#### Call Signature

> **mkcol**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:76

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`mkcol`](../../common/interfaces/HttpServer.md#mkcol)

***

### move()

#### Call Signature

> **move**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:87

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`move`](../../common/interfaces/HttpServer.md#move)

#### Call Signature

> **move**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:88

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`move`](../../common/interfaces/HttpServer.md#move)

***

### normalizePath()

> **normalizePath**(`path`): `string`

Defined in: packages/core/adapters/http-adapter.ts:145

#### Parameters

##### path

`string`

#### Returns

`string`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`normalizePath`](../../common/interfaces/HttpServer.md#normalizepath)

***

### options()

#### Call Signature

> **options**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:117

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`options`](../../common/interfaces/HttpServer.md#options)

#### Call Signature

> **options**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:118

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`options`](../../common/interfaces/HttpServer.md#options)

***

### patch()

#### Call Signature

> **patch**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:57

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`patch`](../../common/interfaces/HttpServer.md#patch)

#### Call Signature

> **patch**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:58

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`patch`](../../common/interfaces/HttpServer.md#patch)

***

### post()

#### Call Signature

> **post**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:33

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`post`](../../common/interfaces/HttpServer.md#post)

#### Call Signature

> **post**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:34

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`post`](../../common/interfaces/HttpServer.md#post)

***

### propfind()

#### Call Signature

> **propfind**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:63

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`propfind`](../../common/interfaces/HttpServer.md#propfind)

#### Call Signature

> **propfind**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:64

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`propfind`](../../common/interfaces/HttpServer.md#propfind)

***

### proppatch()

#### Call Signature

> **proppatch**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:69

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`proppatch`](../../common/interfaces/HttpServer.md#proppatch)

#### Call Signature

> **proppatch**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:70

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`proppatch`](../../common/interfaces/HttpServer.md#proppatch)

***

### put()

#### Call Signature

> **put**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:51

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`put`](../../common/interfaces/HttpServer.md#put)

#### Call Signature

> **put**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:52

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`put`](../../common/interfaces/HttpServer.md#put)

***

### redirect()

> `abstract` **redirect**(`response`, `statusCode`, `url`): `any`

Defined in: packages/core/adapters/http-adapter.ts:174

#### Parameters

##### response

`any`

##### statusCode

`number`

##### url

`string`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`redirect`](../../common/interfaces/HttpServer.md#redirect)

***

### registerParserMiddleware()

> `abstract` **registerParserMiddleware**(`prefix?`, `rawBody?`): `any`

Defined in: packages/core/adapters/http-adapter.ts:181

#### Parameters

##### prefix?

`string`

##### rawBody?

`boolean`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`registerParserMiddleware`](../../common/interfaces/HttpServer.md#registerparsermiddleware)

***

### render()

> `abstract` **render**(`response`, `view`, `options`): `any`

Defined in: packages/core/adapters/http-adapter.ts:173

#### Parameters

##### response

`any`

##### view

`string`

##### options

`any`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`render`](../../common/interfaces/HttpServer.md#render)

***

### reply()

> `abstract` **reply**(`response`, `body`, `statusCode?`): `any`

Defined in: packages/core/adapters/http-adapter.ts:171

#### Parameters

##### response

`any`

##### body

`any`

##### statusCode?

`number`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`reply`](../../common/interfaces/HttpServer.md#reply)

***

### search()

#### Call Signature

> **search**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:111

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`search`](../../common/interfaces/HttpServer.md#search)

#### Call Signature

> **search**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:112

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`search`](../../common/interfaces/HttpServer.md#search)

***

### setErrorHandler()

> `abstract` **setErrorHandler**(`handler`, `prefix?`): `any`

Defined in: packages/core/adapters/http-adapter.ts:175

#### Parameters

##### handler

`Function`

##### prefix?

`string`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`setErrorHandler`](../../common/interfaces/HttpServer.md#seterrorhandler)

***

### setHeader()

> `abstract` **setHeader**(`response`, `name`, `value`): `any`

Defined in: packages/core/adapters/http-adapter.ts:179

#### Parameters

##### response

`any`

##### name

`string`

##### value

`string`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`setHeader`](../../common/interfaces/HttpServer.md#setheader)

***

### setHttpServer()

> **setHttpServer**(`httpServer`): `void`

Defined in: packages/core/adapters/http-adapter.ts:133

#### Parameters

##### httpServer

`TServer`

#### Returns

`void`

***

### setInstance()

> **setInstance**\<`T`\>(`instance`): `void`

Defined in: packages/core/adapters/http-adapter.ts:137

#### Type Parameters

##### T

`T` = `any`

#### Parameters

##### instance

`T`

#### Returns

`void`

***

### setNotFoundHandler()

> `abstract` **setNotFoundHandler**(`handler`, `prefix?`): `any`

Defined in: packages/core/adapters/http-adapter.ts:176

#### Parameters

##### handler

`Function`

##### prefix?

`string`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`setNotFoundHandler`](../../common/interfaces/HttpServer.md#setnotfoundhandler)

***

### setOnRequestHook()

> **setOnRequestHook**(`onRequestHook`): `void`

Defined in: packages/core/adapters/http-adapter.ts:159

#### Parameters

##### onRequestHook

`Function`

#### Returns

`void`

***

### setOnResponseHook()

> **setOnResponseHook**(`onResponseHook`): `void`

Defined in: packages/core/adapters/http-adapter.ts:161

#### Parameters

##### onResponseHook

`Function`

#### Returns

`void`

***

### setOnRouteTriggered()

> **setOnRouteTriggered**(`onRouteTriggered`): `void`

Defined in: packages/core/adapters/http-adapter.ts:149

#### Parameters

##### onRouteTriggered

(`requestMethod`, `path`) => `void`

#### Returns

`void`

***

### setViewEngine()

> `abstract` **setViewEngine**(`engine`): `any`

Defined in: packages/core/adapters/http-adapter.ts:166

#### Parameters

##### engine

`string`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`setViewEngine`](../../common/interfaces/HttpServer.md#setviewengine)

***

### status()

> `abstract` **status**(`response`, `statusCode`): `any`

Defined in: packages/core/adapters/http-adapter.ts:170

#### Parameters

##### response

`any`

##### statusCode

`number`

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`status`](../../common/interfaces/HttpServer.md#status)

***

### unlock()

#### Call Signature

> **unlock**(`handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:99

##### Parameters

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`unlock`](../../common/interfaces/HttpServer.md#unlock)

#### Call Signature

> **unlock**(`path`, `handler`): `any`

Defined in: packages/core/adapters/http-adapter.ts:100

##### Parameters

###### path

`any`

###### handler

`RequestHandler`

##### Returns

`any`

##### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`unlock`](../../common/interfaces/HttpServer.md#unlock)

***

### use()

> **use**(...`args`): `any`

Defined in: packages/core/adapters/http-adapter.ts:23

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`use`](../../common/interfaces/HttpServer.md#use)

***

### useStaticAssets()

> `abstract` **useStaticAssets**(...`args`): `any`

Defined in: packages/core/adapters/http-adapter.ts:165

#### Parameters

##### args

...`any`[]

#### Returns

`any`

#### Implementation of

[`HttpServer`](../../common/interfaces/HttpServer.md).[`useStaticAssets`](../../common/interfaces/HttpServer.md#usestaticassets)
