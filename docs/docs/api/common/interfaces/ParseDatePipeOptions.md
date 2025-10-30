# Interface: ParseDatePipeOptions

Defined in: packages/common/pipes/parse-date.pipe.ts:10

## Properties

### default()?

> `optional` **default**: () => `Date`

Defined in: packages/common/pipes/parse-date.pipe.ts:19

Default value for the date

#### Returns

`Date`

***

### errorHttpStatusCode?

> `optional` **errorHttpStatusCode**: `ErrorHttpStatusCode`

Defined in: packages/common/pipes/parse-date.pipe.ts:23

The HTTP status code to be used in the response when the validation fails.

***

### exceptionFactory()?

> `optional` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/parse-date.pipe.ts:30

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

Defined in: packages/common/pipes/parse-date.pipe.ts:15

If true, the pipe will return null or undefined if the value is not provided

#### Default

```ts
false
```
