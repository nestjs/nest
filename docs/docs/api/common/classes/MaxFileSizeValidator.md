# Class: MaxFileSizeValidator

Defined in: packages/common/pipes/file/max-file-size.validator.ts:16

Defines the built-in MaxSize File Validator

## See

[File Validators](https://docs.nestjs.com/techniques/file-upload#file-validation)

## Public Api

## Extends

- [`FileValidator`](FileValidator.md)\<[`MaxFileSizeValidatorOptions`](../type-aliases/MaxFileSizeValidatorOptions.md), `IFile`\>

## Constructors

### Constructor

> **new MaxFileSizeValidator**(`validationOptions`): `MaxFileSizeValidator`

Defined in: packages/common/pipes/file/file-validator.interface.ts:13

#### Parameters

##### validationOptions

[`MaxFileSizeValidatorOptions`](../type-aliases/MaxFileSizeValidatorOptions.md)

#### Returns

`MaxFileSizeValidator`

#### Inherited from

[`FileValidator`](FileValidator.md).[`constructor`](FileValidator.md#constructor)

## Properties

### validationOptions

> `protected` `readonly` **validationOptions**: [`MaxFileSizeValidatorOptions`](../type-aliases/MaxFileSizeValidatorOptions.md)

Defined in: packages/common/pipes/file/file-validator.interface.ts:13

#### Inherited from

[`FileValidator`](FileValidator.md).[`validationOptions`](FileValidator.md#validationoptions)

## Methods

### buildErrorMessage()

> **buildErrorMessage**(`file?`): `string`

Defined in: packages/common/pipes/file/max-file-size.validator.ts:20

Builds an error message in case the validation fails.

#### Parameters

##### file?

`IFile`

the file from the request object

#### Returns

`string`

#### Overrides

[`FileValidator`](FileValidator.md).[`buildErrorMessage`](FileValidator.md#builderrormessage)

***

### isValid()

> **isValid**(`file?`): `boolean`

Defined in: packages/common/pipes/file/max-file-size.validator.ts:35

Indicates if this file should be considered valid, according to the options passed in the constructor.

#### Parameters

##### file?

`IFile`

the file from the request object

#### Returns

`boolean`

#### Overrides

[`FileValidator`](FileValidator.md).[`isValid`](FileValidator.md#isvalid)
