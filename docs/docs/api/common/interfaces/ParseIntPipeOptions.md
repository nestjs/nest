# Interface: ParseIntPipeOptions

Defined in: packages/common/pipes/parse-int.pipe.ts:17

## Public Api

## Properties

### errorHttpStatusCode?

> `optional` **errorHttpStatusCode**: `ErrorHttpStatusCode`

Defined in: packages/common/pipes/parse-int.pipe.ts:21

The HTTP status code to be used in the response when the validation fails.

***

### exceptionFactory()?

> `optional` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/parse-int.pipe.ts:28

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

Defined in: packages/common/pipes/parse-int.pipe.ts:33

If true, the pipe will return null or undefined if the value is not provided

#### Default

```ts
false
```
