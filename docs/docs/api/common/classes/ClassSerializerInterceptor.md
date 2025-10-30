# Class: ClassSerializerInterceptor

Defined in: packages/common/serializer/class-serializer.interceptor.ts:36

## Public Api

## Implements

- [`NestInterceptor`](../interfaces/NestInterceptor.md)

## Constructors

### Constructor

> **new ClassSerializerInterceptor**(`reflector`, `defaultOptions`): `ClassSerializerInterceptor`

Defined in: packages/common/serializer/class-serializer.interceptor.ts:37

#### Parameters

##### reflector

`any`

##### defaultOptions

[`ClassSerializerInterceptorOptions`](../interfaces/ClassSerializerInterceptorOptions.md) = `{}`

#### Returns

`ClassSerializerInterceptor`

## Properties

### defaultOptions

> `protected` `readonly` **defaultOptions**: [`ClassSerializerInterceptorOptions`](../interfaces/ClassSerializerInterceptorOptions.md) = `{}`

Defined in: packages/common/serializer/class-serializer.interceptor.ts:40

***

### reflector

> `protected` `readonly` **reflector**: `any`

Defined in: packages/common/serializer/class-serializer.interceptor.ts:38

## Methods

### getContextOptions()

> `protected` **getContextOptions**(`context`): [`ClassSerializerContextOptions`](../interfaces/ClassSerializerContextOptions.md) \| `undefined`

Defined in: packages/common/serializer/class-serializer.interceptor.ts:105

#### Parameters

##### context

[`ExecutionContext`](../interfaces/ExecutionContext.md)

#### Returns

[`ClassSerializerContextOptions`](../interfaces/ClassSerializerContextOptions.md) \| `undefined`

***

### intercept()

> **intercept**(`context`, `next`): `Observable`\<`any`\>

Defined in: packages/common/serializer/class-serializer.interceptor.ts:53

Method to implement a custom interceptor.

#### Parameters

##### context

[`ExecutionContext`](../interfaces/ExecutionContext.md)

an `ExecutionContext` object providing methods to access the
route handler and class about to be invoked.

##### next

[`CallHandler`](../interfaces/CallHandler.md)

a reference to the `CallHandler`, which provides access to an
`Observable` representing the response stream from the route handler.

#### Returns

`Observable`\<`any`\>

#### Implementation of

[`NestInterceptor`](../interfaces/NestInterceptor.md).[`intercept`](../interfaces/NestInterceptor.md#intercept)

***

### serialize()

> **serialize**(`response`, `options`): [`PlainLiteralObject`](../interfaces/PlainLiteralObject.md) \| [`PlainLiteralObject`](../interfaces/PlainLiteralObject.md)[]

Defined in: packages/common/serializer/class-serializer.interceptor.ts:71

Serializes responses that are non-null objects nor streamable files.

#### Parameters

##### response

[`PlainLiteralObject`](../interfaces/PlainLiteralObject.md) | [`PlainLiteralObject`](../interfaces/PlainLiteralObject.md)[]

##### options

[`ClassSerializerContextOptions`](../interfaces/ClassSerializerContextOptions.md)

#### Returns

[`PlainLiteralObject`](../interfaces/PlainLiteralObject.md) \| [`PlainLiteralObject`](../interfaces/PlainLiteralObject.md)[]

***

### transformToPlain()

> **transformToPlain**(`plainOrClass`, `options`): [`PlainLiteralObject`](../interfaces/PlainLiteralObject.md)

Defined in: packages/common/serializer/class-serializer.interceptor.ts:84

#### Parameters

##### plainOrClass

`any`

##### options

[`ClassSerializerContextOptions`](../interfaces/ClassSerializerContextOptions.md)

#### Returns

[`PlainLiteralObject`](../interfaces/PlainLiteralObject.md)
