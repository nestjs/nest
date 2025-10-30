# Class: MisdirectedException

Defined in: packages/common/exceptions/misdirected.exception.ts:11

Defines an HTTP exception for *Misdirected* type errors.

## See

[Built-in HTTP exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)

## Public Api

## Extends

- [`HttpException`](HttpException.md)

## Constructors

### Constructor

> **new MisdirectedException**(`objectOrError?`, `descriptionOrOptions?`): `MisdirectedException`

Defined in: packages/common/exceptions/misdirected.exception.ts:36

Instantiate a `MisdirectedException` Exception.

#### Parameters

##### objectOrError?

`any`

string or object describing the error condition.

##### descriptionOrOptions?

either a short description of the HTTP error or an options object used to provide an underlying error cause

`string` | [`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)

#### Returns

`MisdirectedException`

#### Example

```ts
`throw new MisdirectedException()`
```

#### Usage Notes

The HTTP response status code will be 421.
- The `objectOrError` argument defines the JSON response body or the message string.
- The `descriptionOrOptions` argument contains either a short description of the HTTP error or an options object used to provide an underlying error cause.

By default, the JSON response body contains two properties:
- `statusCode`: this will be the value 421.
- `message`: the string `'Bad Gateway'` by default; override this by supplying
a string in the `objectOrError` parameter.

If the parameter `objectOrError` is a string, the response body will contain an
additional property, `error`, with a short description of the HTTP error. To override the
entire JSON response body, pass an object instead. Nest will serialize the object
and return it as the JSON response body.

#### Overrides

[`HttpException`](HttpException.md).[`constructor`](HttpException.md#constructor)

## Properties

### cause

> **cause**: `unknown`

Defined in: packages/common/exceptions/http.exception.ts:32

Exception cause. Indicates the specific original cause of the error.
It is used when catching and re-throwing an error with a more-specific or useful error message in order to still have access to the original error.

#### Inherited from

[`HttpException`](HttpException.md).[`cause`](HttpException.md#cause)

## Methods

### getResponse()

> **getResponse**(): `string` \| `object`

Defined in: packages/common/exceptions/http.exception.ts:107

#### Returns

`string` \| `object`

#### Inherited from

[`HttpException`](HttpException.md).[`getResponse`](HttpException.md#getresponse)

***

### getStatus()

> **getStatus**(): `number`

Defined in: packages/common/exceptions/http.exception.ts:111

#### Returns

`number`

#### Inherited from

[`HttpException`](HttpException.md).[`getStatus`](HttpException.md#getstatus)

***

### initCause()

> **initCause**(): `void`

Defined in: packages/common/exceptions/http.exception.ts:84

Configures error chaining support

#### Returns

`void`

#### See

 - https://nodejs.org/en/blog/release/v16.9.0/#error-cause
 - https://github.com/microsoft/TypeScript/issues/45167

#### Inherited from

[`HttpException`](HttpException.md).[`initCause`](HttpException.md#initcause)

***

### initMessage()

> **initMessage**(): `void`

Defined in: packages/common/exceptions/http.exception.ts:91

#### Returns

`void`

#### Inherited from

[`HttpException`](HttpException.md).[`initMessage`](HttpException.md#initmessage)

***

### initName()

> **initName**(): `void`

Defined in: packages/common/exceptions/http.exception.ts:103

#### Returns

`void`

#### Inherited from

[`HttpException`](HttpException.md).[`initName`](HttpException.md#initname)

***

### createBody()

#### Call Signature

> `static` **createBody**(`nil`, `message`, `statusCode`): [`HttpExceptionBody`](../interfaces/HttpExceptionBody.md)

Defined in: packages/common/exceptions/http.exception.ts:115

##### Parameters

###### nil

`""` | `null`

###### message

[`HttpExceptionBodyMessage`](../type-aliases/HttpExceptionBodyMessage.md)

###### statusCode

`number`

##### Returns

[`HttpExceptionBody`](../interfaces/HttpExceptionBody.md)

##### Inherited from

[`HttpException`](HttpException.md).[`createBody`](HttpException.md#createbody)

#### Call Signature

> `static` **createBody**(`message`, `error`, `statusCode`): [`HttpExceptionBody`](../interfaces/HttpExceptionBody.md)

Defined in: packages/common/exceptions/http.exception.ts:120

##### Parameters

###### message

[`HttpExceptionBodyMessage`](../type-aliases/HttpExceptionBodyMessage.md)

###### error

`string`

###### statusCode

`number`

##### Returns

[`HttpExceptionBody`](../interfaces/HttpExceptionBody.md)

##### Inherited from

[`HttpException`](HttpException.md).[`createBody`](HttpException.md#createbody)

#### Call Signature

> `static` **createBody**\<`Body`\>(`custom`): `Body`

Defined in: packages/common/exceptions/http.exception.ts:125

##### Type Parameters

###### Body

`Body` *extends* `Record`\<`string`, `unknown`\>

##### Parameters

###### custom

`Body`

##### Returns

`Body`

##### Inherited from

[`HttpException`](HttpException.md).[`createBody`](HttpException.md#createbody)

***

### extractDescriptionAndOptionsFrom()

> `static` **extractDescriptionAndOptionsFrom**(`descriptionOrOptions`): [`DescriptionAndOptions`](../interfaces/DescriptionAndOptions.md)

Defined in: packages/common/exceptions/http.exception.ts:170

Utility method used to extract the error description and httpExceptionOptions from the given argument.
This is used by inheriting classes to correctly parse both options.

#### Parameters

##### descriptionOrOptions

`string` | [`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)

#### Returns

[`DescriptionAndOptions`](../interfaces/DescriptionAndOptions.md)

the error description and the httpExceptionOptions as an object.

#### Inherited from

[`HttpException`](HttpException.md).[`extractDescriptionAndOptionsFrom`](HttpException.md#extractdescriptionandoptionsfrom)

***

### getDescriptionFrom()

> `static` **getDescriptionFrom**(`descriptionOrOptions`): `string`

Defined in: packages/common/exceptions/http.exception.ts:151

#### Parameters

##### descriptionOrOptions

`string` | [`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)

#### Returns

`string`

#### Inherited from

[`HttpException`](HttpException.md).[`getDescriptionFrom`](HttpException.md#getdescriptionfrom)

***

### getHttpExceptionOptionsFrom()

> `static` **getHttpExceptionOptionsFrom**(`descriptionOrOptions`): [`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)

Defined in: packages/common/exceptions/http.exception.ts:159

#### Parameters

##### descriptionOrOptions

`string` | [`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)

#### Returns

[`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)

#### Inherited from

[`HttpException`](HttpException.md).[`getHttpExceptionOptionsFrom`](HttpException.md#gethttpexceptionoptionsfrom)
