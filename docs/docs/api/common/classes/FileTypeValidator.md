# Class: FileTypeValidator

Defined in: packages/common/pipes/file/file-type.validator.ts:31

Defines the built-in FileTypeValidator. It validates incoming files by examining
their magic numbers using the file-type package, providing more reliable file type validation
than just checking the mimetype string.

## See

[File Validators](https://docs.nestjs.com/techniques/file-upload#validators)

## Public Api

## Extends

- [`FileValidator`](FileValidator.md)\<[`FileTypeValidatorOptions`](../type-aliases/FileTypeValidatorOptions.md), `IFile`\>

## Constructors

### Constructor

> **new FileTypeValidator**(`validationOptions`): `FileTypeValidator`

Defined in: packages/common/pipes/file/file-validator.interface.ts:13

#### Parameters

##### validationOptions

[`FileTypeValidatorOptions`](../type-aliases/FileTypeValidatorOptions.md)

#### Returns

`FileTypeValidator`

#### Inherited from

[`FileValidator`](FileValidator.md).[`constructor`](FileValidator.md#constructor)

## Properties

### validationOptions

> `protected` `readonly` **validationOptions**: [`FileTypeValidatorOptions`](../type-aliases/FileTypeValidatorOptions.md)

Defined in: packages/common/pipes/file/file-validator.interface.ts:13

#### Inherited from

[`FileValidator`](FileValidator.md).[`validationOptions`](FileValidator.md#validationoptions)

## Methods

### buildErrorMessage()

> **buildErrorMessage**(`file?`): `string`

Defined in: packages/common/pipes/file/file-type.validator.ts:35

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

> **isValid**(`file?`): `Promise`\<`boolean`\>

Defined in: packages/common/pipes/file/file-type.validator.ts:58

Indicates if this file should be considered valid, according to the options passed in the constructor.

#### Parameters

##### file?

`IFile`

the file from the request object

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`FileValidator`](FileValidator.md).[`isValid`](FileValidator.md#isvalid)
