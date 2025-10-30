# Interface: ParseUUIDPipeOptions

Defined in: packages/common/pipes/parse-uuid.pipe.ts:17

## Public Api

## Properties

### errorHttpStatusCode?

> `optional` **errorHttpStatusCode**: `ErrorHttpStatusCode`

Defined in: packages/common/pipes/parse-uuid.pipe.ts:25

The HTTP status code to be used in the response when the validation fails.

***

### exceptionFactory()?

> `optional` **exceptionFactory**: (`errors`) => `any`

Defined in: packages/common/pipes/parse-uuid.pipe.ts:32

A factory function that returns an exception object to be thrown
if validation fails.

#### Parameters

##### errors

`string`

#### Returns

`any`

The exception object

***

### optional?

> `optional` **optional**: `boolean`

Defined in: packages/common/pipes/parse-uuid.pipe.ts:37

If true, the pipe will return null or undefined if the value is not provided

#### Default

```ts
false
```

***

### version?

> `optional` **version**: `"3"` \| `"4"` \| `"5"` \| `"7"`

Defined in: packages/common/pipes/parse-uuid.pipe.ts:21

UUID version to validate
