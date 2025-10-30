# Interface: ParseFloatPipeOptions

Defined in: packages/common/pipes/parse-float.pipe.ts:13

## Public Api

## Properties

### errorHttpStatusCode?

> `optional` **errorHttpStatusCode**: `ErrorHttpStatusCode`

Defined in: packages/common/pipes/parse-float.pipe.ts:17

The HTTP status code to be used in the response when the validation fails.

***

### exceptionFactory()?

> `optional` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/parse-float.pipe.ts:24

A factory function that returns an exception object to be thrown
if validation fails.

#### Parameters

##### error

`string`

Error message

#### Returns

`any`

The exception object

***

### optional?

> `optional` **optional**: `boolean`

Defined in: packages/common/pipes/parse-float.pipe.ts:29

If true, the pipe will return null or undefined if the value is not provided

#### Default

```ts
false
```
