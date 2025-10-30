# Interface: ParseArrayOptions

Defined in: packages/common/pipes/parse-array.pipe.ts:19

## Public Api

## Extends

- `Omit`\<[`ValidationPipeOptions`](ValidationPipeOptions.md), `"transform"` \| `"validateCustomDecorators"` \| `"exceptionFactory"`\>

## Properties

### always?

> `optional` **always**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:43

Set default for `always` option of decorators. Default can be overridden in decorator options.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`always`](ValidationPipeOptions.md#always)

***

### disableErrorMessages?

> `optional` **disableErrorMessages**: `boolean`

Defined in: packages/common/pipes/validation.pipe.ts:28

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`disableErrorMessages`](ValidationPipeOptions.md#disableerrormessages)

***

### dismissDefaultMessages?

> `optional` **dismissDefaultMessages**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:53

If set to true, the validation will not use default messages.
Error message always will be undefined if its not explicitly set.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`dismissDefaultMessages`](ValidationPipeOptions.md#dismissdefaultmessages)

***

### enableDebugMessages?

> `optional` **enableDebugMessages**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:13

If set to true then class-validator will print extra warning messages to the console when something is not right.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`enableDebugMessages`](ValidationPipeOptions.md#enabledebugmessages)

***

### errorHttpStatusCode?

> `optional` **errorHttpStatusCode**: `ErrorHttpStatusCode`

Defined in: packages/common/pipes/validation.pipe.ts:30

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`errorHttpStatusCode`](ValidationPipeOptions.md#errorhttpstatuscode)

***

### exceptionFactory()?

> `optional` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/parse-array.pipe.ts:44

A factory function that returns an exception object to be thrown
if validation fails.

#### Parameters

##### error

`any`

Error message or object

#### Returns

`any`

The exception object

***

### expectedType?

> `optional` **expectedType**: [`Type`](Type.md)\<`any`\>

Defined in: packages/common/pipes/validation.pipe.ts:33

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`expectedType`](ValidationPipeOptions.md#expectedtype)

***

### forbidNonWhitelisted?

> `optional` **forbidNonWhitelisted**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:35

If set to true, instead of stripping non-whitelisted properties validator will throw an error

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`forbidNonWhitelisted`](ValidationPipeOptions.md#forbidnonwhitelisted)

***

### forbidUnknownValues?

> `optional` **forbidUnknownValues**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:70

Settings true will cause fail validation of unknown objects.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`forbidUnknownValues`](ValidationPipeOptions.md#forbidunknownvalues)

***

### groups?

> `optional` **groups**: `string`[]

Defined in: packages/common/interfaces/external/validator-options.interface.ts:39

Groups to be used during validation of the object.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`groups`](ValidationPipeOptions.md#groups)

***

### items?

> `optional` **items**: [`Type`](Type.md)\<`unknown`\>

Defined in: packages/common/pipes/parse-array.pipe.ts:27

Type for items to be converted into

***

### optional?

> `optional` **optional**: `boolean`

Defined in: packages/common/pipes/parse-array.pipe.ts:37

If true, the pipe will return null or undefined if the value is not provided

#### Default

```ts
false
```

***

### separator?

> `optional` **separator**: `string`

Defined in: packages/common/pipes/parse-array.pipe.ts:32

Items separator to split string by

#### Default

```ts
','
```

***

### skipMissingProperties?

> `optional` **skipMissingProperties**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:25

If set to true then validator will skip validation of all properties that are null or undefined in the validating object.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`skipMissingProperties`](ValidationPipeOptions.md#skipmissingproperties)

***

### skipNullProperties?

> `optional` **skipNullProperties**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:21

If set to true then validator will skip validation of all properties that are null in the validating object.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`skipNullProperties`](ValidationPipeOptions.md#skipnullproperties)

***

### skipUndefinedProperties?

> `optional` **skipUndefinedProperties**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:17

If set to true then validator will skip validation of all properties that are undefined in the validating object.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`skipUndefinedProperties`](ValidationPipeOptions.md#skipundefinedproperties)

***

### stopAtFirstError?

> `optional` **stopAtFirstError**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:75

When set to true, validation of the given property will stop after encountering the first error.
This is enabled by default.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`stopAtFirstError`](ValidationPipeOptions.md#stopatfirsterror)

***

### strictGroups?

> `optional` **strictGroups**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:48

If [groups][ValidatorOptions#groups](ValidationPipeOptions.md#groups) is not given or is empty,
ignore decorators with at least one group.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`strictGroups`](ValidationPipeOptions.md#strictgroups)

***

### transformerPackage?

> `optional` **transformerPackage**: `TransformerPackage`

Defined in: packages/common/pipes/validation.pipe.ts:35

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`transformerPackage`](ValidationPipeOptions.md#transformerpackage)

***

### transformOptions?

> `optional` **transformOptions**: `ClassTransformOptions`

Defined in: packages/common/pipes/validation.pipe.ts:29

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`transformOptions`](ValidationPipeOptions.md#transformoptions)

***

### validationError?

> `optional` **validationError**: `object`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:57

ValidationError special options.

#### target?

> `optional` **target**: `boolean`

Indicates if target should be exposed in ValidationError.

#### value?

> `optional` **value**: `boolean`

Indicates if validated value should be exposed in ValidationError.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`validationError`](ValidationPipeOptions.md#validationerror)

***

### validatorPackage?

> `optional` **validatorPackage**: `ValidatorPackage`

Defined in: packages/common/pipes/validation.pipe.ts:34

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`validatorPackage`](ValidationPipeOptions.md#validatorpackage)

***

### whitelist?

> `optional` **whitelist**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:31

If set to true validator will strip validated object of any properties that do not have any decorators.

Tip: if no other decorator is suitable for your property use

#### Allow

decorator.

#### Inherited from

[`ValidationPipeOptions`](ValidationPipeOptions.md).[`whitelist`](ValidationPipeOptions.md#whitelist)
