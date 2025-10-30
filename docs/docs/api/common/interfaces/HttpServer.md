# Interface: HttpServer\<TRequest, TResponse, ServerInstance\>

Defined in: packages/common/interfaces/http/http-server.interface.ts:17

## Type Parameters

### TRequest

`TRequest` = `any`

### TResponse

`TResponse` = `any`

### ServerInstance

`ServerInstance` = `any`

## Methods

### all()

#### Call Signature

> **all**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:60

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> **all**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:61

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### applyVersionFilter()

> **applyVersionFilter**(`handler`, `version`, `versioningOptions`): (`req`, `res`, `next`) => `Function`

Defined in: packages/common/interfaces/http/http-server.interface.ts:96

#### Parameters

##### handler

`Function`

##### version

`VersionValue`

##### versioningOptions

[`VersioningOptions`](../type-aliases/VersioningOptions.md)

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

***

### close()

> **close**(): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:93

#### Returns

`any`

***

### copy()?

#### Call Signature

> `optional` **copy**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:52

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> `optional` **copy**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:53

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### createMiddlewareFactory()

> **createMiddlewareFactory**(`method`): (`path`, `callback`) => `any` \| `Promise`\<(`path`, `callback`) => `any`\>

Defined in: packages/common/interfaces/http/http-server.interface.ts:80

#### Parameters

##### method

[`RequestMethod`](../enumerations/RequestMethod.md)

#### Returns

(`path`, `callback`) => `any` \| `Promise`\<(`path`, `callback`) => `any`\>

***

### delete()

#### Call Signature

> **delete**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:40

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> **delete**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:41

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### enableCors()

> **enableCors**(`options`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:90

#### Parameters

##### options

`any`

#### Returns

`any`

***

### end()

> **end**(`response`, `message?`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:70

#### Parameters

##### response

`any`

##### message?

`string`

#### Returns

`any`

***

### get()

#### Call Signature

> **get**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:34

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> **get**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:35

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### getHttpServer()

> **getHttpServer**(): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:91

#### Returns

`any`

***

### getInstance()

> **getInstance**(): `ServerInstance`

Defined in: packages/common/interfaces/http/http-server.interface.ts:88

#### Returns

`ServerInstance`

***

### getRequestHostname()?

> `optional` **getRequestHostname**(`request`): `string`

Defined in: packages/common/interfaces/http/http-server.interface.ts:85

#### Parameters

##### request

`TRequest`

#### Returns

`string`

***

### getRequestMethod()?

> `optional` **getRequestMethod**(`request`): `string`

Defined in: packages/common/interfaces/http/http-server.interface.ts:86

#### Parameters

##### request

`TRequest`

#### Returns

`string`

***

### getRequestUrl()?

> `optional` **getRequestUrl**(`request`): `string`

Defined in: packages/common/interfaces/http/http-server.interface.ts:87

#### Parameters

##### request

`TRequest`

#### Returns

`string`

***

### getType()

> **getType**(): `string`

Defined in: packages/common/interfaces/http/http-server.interface.ts:94

#### Returns

`string`

***

### head()

#### Call Signature

> **head**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:38

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> **head**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:39

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### init()?

> `optional` **init**(): `Promise`\<`void`\>

Defined in: packages/common/interfaces/http/http-server.interface.ts:95

#### Returns

`Promise`\<`void`\>

***

### initHttpServer()

> **initHttpServer**(`options`): `void`

Defined in: packages/common/interfaces/http/http-server.interface.ts:92

#### Parameters

##### options

[`NestApplicationOptions`](NestApplicationOptions.md)

#### Returns

`void`

***

### isHeadersSent()

> **isHeadersSent**(`response`): `boolean`

Defined in: packages/common/interfaces/http/http-server.interface.ts:73

#### Parameters

##### response

`any`

#### Returns

`boolean`

***

### listen()

#### Call Signature

> **listen**(`port`, `callback?`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:66

##### Parameters

###### port

`string` | `number`

###### callback?

() => `void`

##### Returns

`any`

#### Call Signature

> **listen**(`port`, `hostname`, `callback?`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:67

##### Parameters

###### port

`string` | `number`

###### hostname

`string`

###### callback?

() => `void`

##### Returns

`any`

***

### lock()?

#### Call Signature

> `optional` **lock**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:56

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> `optional` **lock**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:57

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### mkcol()?

#### Call Signature

> `optional` **mkcol**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:50

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> `optional` **mkcol**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:51

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### move()?

#### Call Signature

> `optional` **move**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:54

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> `optional` **move**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:55

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### normalizePath()?

> `optional` **normalizePath**(`path`): `string`

Defined in: packages/common/interfaces/http/http-server.interface.ts:101

#### Parameters

##### path

`string`

#### Returns

`string`

***

### options()

#### Call Signature

> **options**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:62

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> **options**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:63

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### patch()

#### Call Signature

> **patch**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:44

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> **patch**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:45

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### post()

#### Call Signature

> **post**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:36

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> **post**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:37

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### propfind()?

#### Call Signature

> `optional` **propfind**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:46

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> `optional` **propfind**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:47

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### proppatch()?

#### Call Signature

> `optional` **proppatch**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:48

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> `optional` **proppatch**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:49

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### put()

#### Call Signature

> **put**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:42

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> **put**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:43

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### redirect()

> **redirect**(`response`, `statusCode`, `url`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:72

#### Parameters

##### response

`any`

##### statusCode

`number`

##### url

`string`

#### Returns

`any`

***

### registerParserMiddleware()

> **registerParserMiddleware**(...`args`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:89

#### Parameters

##### args

...`any`[]

#### Returns

`any`

***

### render()

> **render**(`response`, `view`, `options`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:71

#### Parameters

##### response

`any`

##### view

`string`

##### options

`any`

#### Returns

`any`

***

### reply()

> **reply**(`response`, `body`, `statusCode?`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:68

#### Parameters

##### response

`any`

##### body

`any`

##### statusCode?

`number`

#### Returns

`any`

***

### search()?

#### Call Signature

> `optional` **search**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:64

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> `optional` **search**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:65

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### setBaseViewsDir()?

> `optional` **setBaseViewsDir**(`path`): `this`

Defined in: packages/common/interfaces/http/http-server.interface.ts:78

#### Parameters

##### path

`string` | `string`[]

#### Returns

`this`

***

### setErrorHandler()?

> `optional` **setErrorHandler**(`handler`, `prefix?`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:75

#### Parameters

##### handler

`Function`

##### prefix?

`string`

#### Returns

`any`

***

### setHeader()

> **setHeader**(`response`, `name`, `value`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:74

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

### setNotFoundHandler()?

> `optional` **setNotFoundHandler**(`handler`, `prefix?`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:76

#### Parameters

##### handler

`Function`

##### prefix?

`string`

#### Returns

`any`

***

### setViewEngine()?

> `optional` **setViewEngine**(`engineOrOptions`): `this`

Defined in: packages/common/interfaces/http/http-server.interface.ts:79

#### Parameters

##### engineOrOptions

`any`

#### Returns

`this`

***

### status()

> **status**(`response`, `statusCode`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:69

#### Parameters

##### response

`any`

##### statusCode

`number`

#### Returns

`any`

***

### unlock()?

#### Call Signature

> `optional` **unlock**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:58

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> `optional` **unlock**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:59

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### use()

#### Call Signature

> **use**(`handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:22

##### Parameters

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\> | `ErrorHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

#### Call Signature

> **use**(`path`, `handler`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:27

##### Parameters

###### path

`string`

###### handler

`RequestHandler`\<`TRequest`, `TResponse`\> | `ErrorHandler`\<`TRequest`, `TResponse`\>

##### Returns

`any`

***

### useBodyParser()?

> `optional` **useBodyParser**(...`args`): `any`

Defined in: packages/common/interfaces/http/http-server.interface.ts:33

#### Parameters

##### args

...`any`[]

#### Returns

`any`

***

### useStaticAssets()?

> `optional` **useStaticAssets**(...`args`): `this`

Defined in: packages/common/interfaces/http/http-server.interface.ts:77

#### Parameters

##### args

...`any`[]

#### Returns

`this`
