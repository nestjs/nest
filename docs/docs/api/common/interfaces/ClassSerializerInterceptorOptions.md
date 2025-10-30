# Interface: ClassSerializerInterceptorOptions

Defined in: packages/common/serializer/class-serializer.interceptor.ts:27

## Public Api

## Extends

- `ClassTransformOptions`

## Properties

### enableCircularCheck?

> `optional` **enableCircularCheck**: `boolean`

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:43

If set to true then class transformer will perform a circular check. (Circular check is turned off by default)
This option is useful when you know for sure that your types might have a circular dependency.

#### Inherited from

`ClassTransformOptions.enableCircularCheck`

***

### enableImplicitConversion?

> `optional` **enableImplicitConversion**: `boolean`

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:47

If set to true class-transformer will attempt conversion based on TS reflected type

#### Inherited from

`ClassTransformOptions.enableImplicitConversion`

***

### excludeExtraneousValues?

> `optional` **excludeExtraneousValues**: `boolean`

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:52

If set to true class-transformer will exclude properties which are not part of the original class
and exposing all class properties (with undefined, if nothing else is given)

#### Inherited from

`ClassTransformOptions.excludeExtraneousValues`

***

### excludePrefixes?

> `optional` **excludePrefixes**: `string`[]

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:27

Excludes properties with the given prefixes. For example, if you mark your private properties with "_" and "__"
you can set this option's value to ["_", "__"] and all private properties will be skipped.
This works only for "exposeAll" strategy.

#### Inherited from

`ClassTransformOptions.excludePrefixes`

***

### exposeDefaultValues?

> `optional` **exposeDefaultValues**: `boolean`

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:57

If set to true then class transformer will take default values for unprovided fields.
This is useful when you convert a plain object to a class and have an optional field with a default value.

#### Inherited from

`ClassTransformOptions.exposeDefaultValues`

***

### exposeUnsetFields?

> `optional` **exposeUnsetFields**: `boolean`

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:64

When set to true, fields with `undefined` as value will be included in class to plain transformation. Otherwise
those fields will be omitted from the result.

DEFAULT: `true`

#### Inherited from

`ClassTransformOptions.exposeUnsetFields`

***

### groups?

> `optional` **groups**: `string`[]

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:17

Only properties with given groups will be transformed.

#### Inherited from

`ClassTransformOptions.groups`

***

### ignoreDecorators?

> `optional` **ignoreDecorators**: `boolean`

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:32

If set to true then class transformer will ignore all

#### Expose

and

#### Exclude

decorators and what's inside them.
This option is useful if you want to "clone" your object but not apply decorators affects.

#### Inherited from

`ClassTransformOptions.ignoreDecorators`

***

### strategy?

> `optional` **strategy**: `"excludeAll"` \| `"exposeAll"`

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:13

Exclusion strategy. By default exposeAll is used, which means that it will expose all properties that
are transformed by default.

#### Inherited from

`ClassTransformOptions.strategy`

***

### targetMaps?

> `optional` **targetMaps**: `any`[]

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:38

Target maps allows to set a Types of the transforming object without using

#### Type

decorator.
This is useful when you are transforming external classes, or if you already have type metadata for
objects and you don't want to set it up again.

#### Inherited from

`ClassTransformOptions.targetMaps`

***

### transformerPackage?

> `optional` **transformerPackage**: `TransformerPackage`

Defined in: packages/common/serializer/class-serializer.interceptor.ts:29

***

### version?

> `optional` **version**: `number`

Defined in: packages/common/interfaces/external/class-transform-options.interface.ts:21

Only properties with "since" > version < "until" will be transformed.

#### Inherited from

`ClassTransformOptions.version`
