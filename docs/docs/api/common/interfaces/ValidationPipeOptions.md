# Interface: ValidationPipeOptions

Defined in: packages/common/pipes/validation.pipe.ts:26

## Public Api

## Extends

- `ValidatorOptions`

## Properties

### always?

> `optional` **always**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:43

Set default for `always` option of decorators. Default can be overridden in decorator options.

#### Inherited from

`ValidatorOptions.always`

***

### disableErrorMessages?

> `optional` **disableErrorMessages**: `boolean`

Defined in: packages/common/pipes/validation.pipe.ts:28

***

### dismissDefaultMessages?

> `optional` **dismissDefaultMessages**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:53

If set to true, the validation will not use default messages.
Error message always will be undefined if its not explicitly set.

#### Inherited from

`ValidatorOptions.dismissDefaultMessages`

***

### enableDebugMessages?

> `optional` **enableDebugMessages**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:13

If set to true then class-validator will print extra warning messages to the console when something is not right.

#### Inherited from

`ValidatorOptions.enableDebugMessages`

***

### errorHttpStatusCode?

> `optional` **errorHttpStatusCode**: `ErrorHttpStatusCode`

Defined in: packages/common/pipes/validation.pipe.ts:30

***

### exceptionFactory()?

> `optional` **exceptionFactory**: (`errors`) => `any`

Defined in: packages/common/pipes/validation.pipe.ts:31

#### Parameters

##### errors

[`ValidationError`](ValidationError.md)[]

#### Returns

`any`

***

### expectedType?

> `optional` **expectedType**: [`Type`](Type.md)\<`any`\>

Defined in: packages/common/pipes/validation.pipe.ts:33

***

### forbidNonWhitelisted?

> `optional` **forbidNonWhitelisted**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:35

If set to true, instead of stripping non-whitelisted properties validator will throw an error

#### Inherited from

`ValidatorOptions.forbidNonWhitelisted`

***

### forbidUnknownValues?

> `optional` **forbidUnknownValues**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:70

Settings true will cause fail validation of unknown objects.

#### Inherited from

`ValidatorOptions.forbidUnknownValues`

***

### groups?

> `optional` **groups**: `string`[]

Defined in: packages/common/interfaces/external/validator-options.interface.ts:39

Groups to be used during validation of the object.

#### Inherited from

`ValidatorOptions.groups`

***

### skipMissingProperties?

> `optional` **skipMissingProperties**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:25

If set to true then validator will skip validation of all properties that are null or undefined in the validating object.

#### Inherited from

`ValidatorOptions.skipMissingProperties`

***

### skipNullProperties?

> `optional` **skipNullProperties**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:21

If set to true then validator will skip validation of all properties that are null in the validating object.

#### Inherited from

`ValidatorOptions.skipNullProperties`

***

### skipUndefinedProperties?

> `optional` **skipUndefinedProperties**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:17

If set to true then validator will skip validation of all properties that are undefined in the validating object.

#### Inherited from

`ValidatorOptions.skipUndefinedProperties`

***

### stopAtFirstError?

> `optional` **stopAtFirstError**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:75

When set to true, validation of the given property will stop after encountering the first error.
This is enabled by default.

#### Inherited from

`ValidatorOptions.stopAtFirstError`

***

### strictGroups?

> `optional` **strictGroups**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:48

If [groups][ValidatorOptions#groups](#groups) is not given or is empty,
ignore decorators with at least one group.

#### Inherited from

`ValidatorOptions.strictGroups`

***

### transform?

> `optional` **transform**: `boolean`

Defined in: packages/common/pipes/validation.pipe.ts:27

***

### transformerPackage?

> `optional` **transformerPackage**: `TransformerPackage`

Defined in: packages/common/pipes/validation.pipe.ts:35

***

### transformOptions?

> `optional` **transformOptions**: `ClassTransformOptions`

Defined in: packages/common/pipes/validation.pipe.ts:29

***

### validateCustomDecorators?

> `optional` **validateCustomDecorators**: `boolean`

Defined in: packages/common/pipes/validation.pipe.ts:32

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

`ValidatorOptions.validationError`

***

### validatorPackage?

> `optional` **validatorPackage**: `ValidatorPackage`

Defined in: packages/common/pipes/validation.pipe.ts:34

***

### whitelist?

> `optional` **whitelist**: `boolean`

Defined in: packages/common/interfaces/external/validator-options.interface.ts:31

If set to true validator will strip validated object of any properties that do not have any decorators.

Tip: if no other decorator is suitable for your property use

#### Allow

decorator.

#### Inherited from

`ValidatorOptions.whitelist`
