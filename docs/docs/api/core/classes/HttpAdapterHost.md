# Class: HttpAdapterHost\<T\>

Defined in: packages/core/helpers/http-adapter-host.ts:16

Defines the `HttpAdapterHost` object.

`HttpAdapterHost` wraps the underlying
platform-specific `HttpAdapter`.  The `HttpAdapter` is a wrapper around the underlying
native HTTP server library (e.g., Express).  The `HttpAdapterHost` object
provides methods to `get` and `set` the underlying HttpAdapter.

## See

[Http adapter](https://docs.nestjs.com/faq/http-adapter)

## Public Api

## Type Parameters

### T

`T` *extends* [`AbstractHttpAdapter`](AbstractHttpAdapter.md) = [`AbstractHttpAdapter`](AbstractHttpAdapter.md)

## Constructors

### Constructor

> **new HttpAdapterHost**\<`T`\>(): `HttpAdapterHost`\<`T`\>

#### Returns

`HttpAdapterHost`\<`T`\>

## Accessors

### httpAdapter

#### Get Signature

> **get** **httpAdapter**(): `T`

Defined in: packages/core/helpers/http-adapter-host.ts:42

Accessor for the underlying `HttpAdapter`

##### Example

```ts
`const httpAdapter = adapterHost.httpAdapter;`
```

##### Returns

`T`

#### Set Signature

> **set** **httpAdapter**(`httpAdapter`): `void`

Defined in: packages/core/helpers/http-adapter-host.ts:29

Accessor for the underlying `HttpAdapter`

##### Parameters

###### httpAdapter

`T`

reference to the `HttpAdapter` to be set

##### Returns

`void`

***

### init$

#### Get Signature

> **get** **init$**(): `Observable`\<`void`\>

Defined in: packages/core/helpers/http-adapter-host.ts:58

Observable that allows to subscribe to the `init` event.
This event is emitted when the HTTP application is initialized.

##### Returns

`Observable`\<`void`\>

***

### listen$

#### Get Signature

> **get** **listen$**(): `Observable`\<`void`\>

Defined in: packages/core/helpers/http-adapter-host.ts:50

Observable that allows to subscribe to the `listen` event.
This event is emitted when the HTTP application is listening for incoming requests.

##### Returns

`Observable`\<`void`\>

***

### listening

#### Get Signature

> **get** **listening**(): `boolean`

Defined in: packages/core/helpers/http-adapter-host.ts:77

Returns a boolean indicating whether the application is listening for incoming requests.

##### Returns

`boolean`

#### Set Signature

> **set** **listening**(`listening`): `void`

Defined in: packages/core/helpers/http-adapter-host.ts:65

Sets the listening state of the application.

##### Parameters

###### listening

`boolean`

##### Returns

`void`
