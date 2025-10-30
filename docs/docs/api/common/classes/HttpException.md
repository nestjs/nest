# Class: HttpException

Defined in: packages/common/exceptions/http.exception.ts:27

Defines the base Nest HTTP exception, which is handled by the default
Exceptions Handler.

## See

[Built-in HTTP exceptions](https://docs.nestjs.com/exception-filters#built-in-http-exceptions)

## Public Api

## Extends

- [`IntrinsicException`](IntrinsicException.md)

## Extended by

- [`BadGatewayException`](BadGatewayException.md)
- [`BadRequestException`](BadRequestException.md)
- [`ConflictException`](ConflictException.md)
- [`ForbiddenException`](ForbiddenException.md)
- [`GatewayTimeoutException`](GatewayTimeoutException.md)
- [`GoneException`](GoneException.md)
- [`HttpVersionNotSupportedException`](HttpVersionNotSupportedException.md)
- [`ImATeapotException`](ImATeapotException.md)
- [`InternalServerErrorException`](InternalServerErrorException.md)
- [`MethodNotAllowedException`](MethodNotAllowedException.md)
- [`MisdirectedException`](MisdirectedException.md)
- [`NotAcceptableException`](NotAcceptableException.md)
- [`NotFoundException`](NotFoundException.md)
- [`NotImplementedException`](NotImplementedException.md)
- [`PayloadTooLargeException`](PayloadTooLargeException.md)
- [`PreconditionFailedException`](PreconditionFailedException.md)
- [`RequestTimeoutException`](RequestTimeoutException.md)
- [`ServiceUnavailableException`](ServiceUnavailableException.md)
- [`UnauthorizedException`](UnauthorizedException.md)
- [`UnprocessableEntityException`](UnprocessableEntityException.md)
- [`UnsupportedMediaTypeException`](UnsupportedMediaTypeException.md)

## Constructors

### Constructor

> **new HttpException**(`response`, `status`, `options?`): `HttpException`

Defined in: packages/common/exceptions/http.exception.ts:67

Instantiate a plain HTTP Exception.

#### Parameters

##### response

string, object describing the error condition or the error cause.

`string` | `Record`\<`string`, `any`\>

##### status

`number`

HTTP response status code.

##### options?

[`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)

An object used to add an error cause.

#### Returns

`HttpException`

#### Example

```ts
throw new HttpException('message', HttpStatus.BAD_REQUEST)
throw new HttpException('custom message', HttpStatus.BAD_REQUEST, {
 cause: new Error('Cause Error'),
})
```

#### Usage Notes

The constructor arguments define the response and the HTTP response status code.
- The `response` argument (required) defines the JSON response body. alternatively, it can also be
 an error object that is used to define an error [cause](https://nodejs.org/en/blog/release/v16.9.0/#error-cause).
- The `status` argument (required) defines the HTTP Status Code.
- The `options` argument (optional) defines additional error options. Currently, it supports the `cause` attribute,
 and can be used as an alternative way to specify the error cause: `const error = new HttpException('description', 400, { cause: new Error() });`

By default, the JSON response body contains two properties:
- `statusCode`: the Http Status Code.
- `message`: a short description of the HTTP error by default; override this
by supplying a string in the `response` parameter.

To override the entire JSON response body, pass an object to the `createBody`
method. Nest will serialize the object and return it as the JSON response body.

The `status` argument is required, and should be a valid HTTP status code.
Best practice is to use the `HttpStatus` enum imported from `nestjs/common`.

#### Overrides

[`IntrinsicException`](IntrinsicException.md).[`constructor`](IntrinsicException.md#constructor)

## Properties

### cause

> **cause**: `unknown`

Defined in: packages/common/exceptions/http.exception.ts:32

Exception cause. Indicates the specific original cause of the error.
It is used when catching and re-throwing an error with a more-specific or useful error message in order to still have access to the original error.

## Methods

### getResponse()

> **getResponse**(): `string` \| `object`

Defined in: packages/common/exceptions/http.exception.ts:107

#### Returns

`string` \| `object`

***

### getStatus()

> **getStatus**(): `number`

Defined in: packages/common/exceptions/http.exception.ts:111

#### Returns

`number`

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

***

### initMessage()

> **initMessage**(): `void`

Defined in: packages/common/exceptions/http.exception.ts:91

#### Returns

`void`

***

### initName()

> **initName**(): `void`

Defined in: packages/common/exceptions/http.exception.ts:103

#### Returns

`void`

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

***

### getDescriptionFrom()

> `static` **getDescriptionFrom**(`descriptionOrOptions`): `string`

Defined in: packages/common/exceptions/http.exception.ts:151

#### Parameters

##### descriptionOrOptions

`string` | [`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)

#### Returns

`string`

***

### getHttpExceptionOptionsFrom()

> `static` **getHttpExceptionOptionsFrom**(`descriptionOrOptions`): [`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)

Defined in: packages/common/exceptions/http.exception.ts:159

#### Parameters

##### descriptionOrOptions

`string` | [`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)

#### Returns

[`HttpExceptionOptions`](../interfaces/HttpExceptionOptions.md)
