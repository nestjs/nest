# Class: ApplicationConfig

Defined in: packages/core/application-config.ts:13

## Constructors

### Constructor

> **new ApplicationConfig**(`ioAdapter`): `ApplicationConfig`

Defined in: packages/core/application-config.ts:28

#### Parameters

##### ioAdapter

[`WebSocketAdapter`](../../common/interfaces/WebSocketAdapter.md)\<`any`, `any`, `any`\> | `null`

#### Returns

`ApplicationConfig`

## Methods

### addGlobalFilter()

> **addGlobalFilter**(`filter`): `void`

Defined in: packages/core/application-config.ts:68

#### Parameters

##### filter

[`ExceptionFilter`](../../common/interfaces/ExceptionFilter.md)

#### Returns

`void`

***

### addGlobalGuard()

> **addGlobalGuard**(`guard`): `void`

Defined in: packages/core/application-config.ts:96

#### Parameters

##### guard

[`CanActivate`](../../common/interfaces/CanActivate.md)

#### Returns

`void`

***

### addGlobalInterceptor()

> **addGlobalInterceptor**(`interceptor`): `void`

Defined in: packages/core/application-config.ts:84

#### Parameters

##### interceptor

[`NestInterceptor`](../../common/interfaces/NestInterceptor.md)

#### Returns

`void`

***

### addGlobalPipe()

> **addGlobalPipe**(`pipe`): `void`

Defined in: packages/core/application-config.ts:56

#### Parameters

##### pipe

[`PipeTransform`](../../common/interfaces/PipeTransform.md)\<`any`\>

#### Returns

`void`

***

### addGlobalRequestFilter()

> **addGlobalRequestFilter**(`wrapper`): `void`

Defined in: packages/core/application-config.ts:122

#### Parameters

##### wrapper

`InstanceWrapper`\<[`ExceptionFilter`](../../common/interfaces/ExceptionFilter.md)\<`any`\>\>

#### Returns

`void`

***

### addGlobalRequestGuard()

> **addGlobalRequestGuard**(`wrapper`): `void`

Defined in: packages/core/application-config.ts:130

#### Parameters

##### wrapper

`InstanceWrapper`\<[`CanActivate`](../../common/interfaces/CanActivate.md)\>

#### Returns

`void`

***

### addGlobalRequestInterceptor()

> **addGlobalRequestInterceptor**(`wrapper`): `void`

Defined in: packages/core/application-config.ts:104

#### Parameters

##### wrapper

`InstanceWrapper`\<[`NestInterceptor`](../../common/interfaces/NestInterceptor.md)\<`any`, `any`\>\>

#### Returns

`void`

***

### addGlobalRequestPipe()

> **addGlobalRequestPipe**(`wrapper`): `void`

Defined in: packages/core/application-config.ts:114

#### Parameters

##### wrapper

`InstanceWrapper`\<[`PipeTransform`](../../common/interfaces/PipeTransform.md)\<`any`, `any`\>\>

#### Returns

`void`

***

### enableVersioning()

> **enableVersioning**(`options`): `void`

Defined in: packages/core/application-config.ts:138

#### Parameters

##### options

[`VersioningOptions`](../../common/type-aliases/VersioningOptions.md)

#### Returns

`void`

***

### getGlobalFilters()

> **getGlobalFilters**(): [`ExceptionFilter`](../../common/interfaces/ExceptionFilter.md)\<`any`\>[]

Defined in: packages/core/application-config.ts:64

#### Returns

[`ExceptionFilter`](../../common/interfaces/ExceptionFilter.md)\<`any`\>[]

***

### getGlobalGuards()

> **getGlobalGuards**(): [`CanActivate`](../../common/interfaces/CanActivate.md)[]

Defined in: packages/core/application-config.ts:92

#### Returns

[`CanActivate`](../../common/interfaces/CanActivate.md)[]

***

### getGlobalInterceptors()

> **getGlobalInterceptors**(): [`NestInterceptor`](../../common/interfaces/NestInterceptor.md)\<`any`, `any`\>[]

Defined in: packages/core/application-config.ts:80

#### Returns

[`NestInterceptor`](../../common/interfaces/NestInterceptor.md)\<`any`, `any`\>[]

***

### getGlobalPipes()

> **getGlobalPipes**(): [`PipeTransform`](../../common/interfaces/PipeTransform.md)\<`any`, `any`\>[]

Defined in: packages/core/application-config.ts:76

#### Returns

[`PipeTransform`](../../common/interfaces/PipeTransform.md)\<`any`, `any`\>[]

***

### getGlobalPrefix()

> **getGlobalPrefix**(): `string`

Defined in: packages/core/application-config.ts:34

#### Returns

`string`

***

### getGlobalPrefixOptions()

> **getGlobalPrefixOptions**(): `GlobalPrefixOptions`\<`ExcludeRouteMetadata`\>

Defined in: packages/core/application-config.ts:44

#### Returns

`GlobalPrefixOptions`\<`ExcludeRouteMetadata`\>

***

### getGlobalRequestFilters()

> **getGlobalRequestFilters**(): `InstanceWrapper`\<[`ExceptionFilter`](../../common/interfaces/ExceptionFilter.md)\<`any`\>\>[]

Defined in: packages/core/application-config.ts:126

#### Returns

`InstanceWrapper`\<[`ExceptionFilter`](../../common/interfaces/ExceptionFilter.md)\<`any`\>\>[]

***

### getGlobalRequestGuards()

> **getGlobalRequestGuards**(): `InstanceWrapper`\<[`CanActivate`](../../common/interfaces/CanActivate.md)\>[]

Defined in: packages/core/application-config.ts:134

#### Returns

`InstanceWrapper`\<[`CanActivate`](../../common/interfaces/CanActivate.md)\>[]

***

### getGlobalRequestInterceptors()

> **getGlobalRequestInterceptors**(): `InstanceWrapper`\<[`NestInterceptor`](../../common/interfaces/NestInterceptor.md)\<`any`, `any`\>\>[]

Defined in: packages/core/application-config.ts:110

#### Returns

`InstanceWrapper`\<[`NestInterceptor`](../../common/interfaces/NestInterceptor.md)\<`any`, `any`\>\>[]

***

### getGlobalRequestPipes()

> **getGlobalRequestPipes**(): `InstanceWrapper`\<[`PipeTransform`](../../common/interfaces/PipeTransform.md)\<`any`, `any`\>\>[]

Defined in: packages/core/application-config.ts:118

#### Returns

`InstanceWrapper`\<[`PipeTransform`](../../common/interfaces/PipeTransform.md)\<`any`, `any`\>\>[]

***

### getIoAdapter()

> **getIoAdapter**(): [`WebSocketAdapter`](../../common/interfaces/WebSocketAdapter.md)

Defined in: packages/core/application-config.ts:52

#### Returns

[`WebSocketAdapter`](../../common/interfaces/WebSocketAdapter.md)

***

### getVersioning()

> **getVersioning**(): [`VersioningOptions`](../../common/type-aliases/VersioningOptions.md) \| `undefined`

Defined in: packages/core/application-config.ts:147

#### Returns

[`VersioningOptions`](../../common/type-aliases/VersioningOptions.md) \| `undefined`

***

### setGlobalPrefix()

> **setGlobalPrefix**(`prefix`): `void`

Defined in: packages/core/application-config.ts:30

#### Parameters

##### prefix

`string`

#### Returns

`void`

***

### setGlobalPrefixOptions()

> **setGlobalPrefixOptions**(`options`): `void`

Defined in: packages/core/application-config.ts:38

#### Parameters

##### options

`GlobalPrefixOptions`\<`ExcludeRouteMetadata`\>

#### Returns

`void`

***

### setIoAdapter()

> **setIoAdapter**(`ioAdapter`): `void`

Defined in: packages/core/application-config.ts:48

#### Parameters

##### ioAdapter

[`WebSocketAdapter`](../../common/interfaces/WebSocketAdapter.md)

#### Returns

`void`

***

### useGlobalFilters()

> **useGlobalFilters**(...`filters`): `void`

Defined in: packages/core/application-config.ts:72

#### Parameters

##### filters

...[`ExceptionFilter`](../../common/interfaces/ExceptionFilter.md)\<`any`\>[]

#### Returns

`void`

***

### useGlobalGuards()

> **useGlobalGuards**(...`guards`): `void`

Defined in: packages/core/application-config.ts:100

#### Parameters

##### guards

...[`CanActivate`](../../common/interfaces/CanActivate.md)[]

#### Returns

`void`

***

### useGlobalInterceptors()

> **useGlobalInterceptors**(...`interceptors`): `void`

Defined in: packages/core/application-config.ts:88

#### Parameters

##### interceptors

...[`NestInterceptor`](../../common/interfaces/NestInterceptor.md)\<`any`, `any`\>[]

#### Returns

`void`

***

### useGlobalPipes()

> **useGlobalPipes**(...`pipes`): `void`

Defined in: packages/core/application-config.ts:60

#### Parameters

##### pipes

...[`PipeTransform`](../../common/interfaces/PipeTransform.md)\<`any`, `any`\>[]

#### Returns

`void`
