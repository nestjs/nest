# Class: DiscoveryService

Defined in: packages/core/discovery/discovery-service.ts:50

## Public Api

## Constructors

### Constructor

> **new DiscoveryService**(`modulesContainer`): `DiscoveryService`

Defined in: packages/core/discovery/discovery-service.ts:51

#### Parameters

##### modulesContainer

[`ModulesContainer`](ModulesContainer.md)

#### Returns

`DiscoveryService`

## Methods

### getControllers()

> **getControllers**(`options`, `modules`): `InstanceWrapper`\<`any`\>[]

Defined in: packages/core/discovery/discovery-service.ts:107

Returns an array of instance wrappers (controllers).
Depending on the options, the array will contain either all controllers or only controllers with the specified metadata key.

#### Parameters

##### options

[`DiscoveryOptions`](../type-aliases/DiscoveryOptions.md) = `{}`

Discovery options.

##### modules

`Module`[] = `...`

A list of modules to filter by.

#### Returns

`InstanceWrapper`\<`any`\>[]

An array of instance wrappers (controllers).

***

### getMetadataByDecorator()

> **getMetadataByDecorator**\<`T`\>(`decorator`, `instanceWrapper`, `methodKey?`): `T` *extends* [`DiscoverableDecorator`](../type-aliases/DiscoverableDecorator.md)\<`R`\> ? `R` \| `undefined` : `T` \| `undefined`

Defined in: packages/core/discovery/discovery-service.ts:131

Retrieves metadata from the specified instance wrapper.

#### Type Parameters

##### T

`T` *extends* [`DiscoverableDecorator`](../type-aliases/DiscoverableDecorator.md)\<`any`\>

#### Parameters

##### decorator

`T`

The decorator to retrieve metadata of.

##### instanceWrapper

`InstanceWrapper`

Reference to the instance wrapper.

##### methodKey?

`string`

An optional method key to retrieve metadata from.

#### Returns

`T` *extends* [`DiscoverableDecorator`](../type-aliases/DiscoverableDecorator.md)\<`R`\> ? `R` \| `undefined` : `T` \| `undefined`

Discovered metadata.

***

### getModules()

> `protected` **getModules**(`options`): `Module`[]

Defined in: packages/core/discovery/discovery-service.ts:151

Returns a list of modules to be used for discovery.

#### Parameters

##### options

[`DiscoveryOptions`](../type-aliases/DiscoveryOptions.md) = `{}`

#### Returns

`Module`[]

***

### getProviders()

> **getProviders**(`options`, `modules`): `InstanceWrapper`\<`any`\>[]

Defined in: packages/core/discovery/discovery-service.ts:84

Returns an array of instance wrappers (providers).
Depending on the options, the array will contain either all providers or only providers with the specified metadata key.

#### Parameters

##### options

[`DiscoveryOptions`](../type-aliases/DiscoveryOptions.md) = `{}`

Discovery options.

##### modules

`Module`[] = `...`

A list of modules to filter by.

#### Returns

`InstanceWrapper`\<`any`\>[]

An array of instance wrappers (providers).

***

### createDecorator()

> `static` **createDecorator**\<`T`\>(): [`DiscoverableDecorator`](../type-aliases/DiscoverableDecorator.md)\<`T`\>

Defined in: packages/core/discovery/discovery-service.ts:59

Creates a decorator that can be used to decorate classes and methods with metadata.
The decorator will also add the class to the collection of discoverable classes (by metadata key).
Decorated classes can be discovered using the `getProviders` and `getControllers` methods.

#### Type Parameters

##### T

`T`

#### Returns

[`DiscoverableDecorator`](../type-aliases/DiscoverableDecorator.md)\<`T`\>

A decorator function.
