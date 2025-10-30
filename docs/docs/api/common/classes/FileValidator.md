# Abstract Class: FileValidator\<TValidationOptions, TFile\>

Defined in: packages/common/pipes/file/file-validator.interface.ts:9

Interface describing FileValidators, which can be added to a ParseFilePipe

## See

## Public Api

## Extended by

- [`FileTypeValidator`](FileTypeValidator.md)
- [`MaxFileSizeValidator`](MaxFileSizeValidator.md)

## Type Parameters

### TValidationOptions

`TValidationOptions` = `Record`\<`string`, `any`\>

### TFile

`TFile` *extends* `IFile` = `IFile`

## Constructors

### Constructor

> **new FileValidator**\<`TValidationOptions`, `TFile`\>(`validationOptions`): `FileValidator`\<`TValidationOptions`, `TFile`\>

Defined in: packages/common/pipes/file/file-validator.interface.ts:13

#### Parameters

##### validationOptions

`TValidationOptions`

#### Returns

`FileValidator`\<`TValidationOptions`, `TFile`\>

## Properties

### validationOptions

> `protected` `readonly` **validationOptions**: `TValidationOptions`

Defined in: packages/common/pipes/file/file-validator.interface.ts:13

## Methods

### buildErrorMessage()

> `abstract` **buildErrorMessage**(`file`): `string`

Defined in: packages/common/pipes/file/file-validator.interface.ts:27

Builds an error message in case the validation fails.

#### Parameters

##### file

`any`

the file from the request object

#### Returns

`string`

***

### isValid()

> `abstract` **isValid**(`file?`): `boolean` \| `Promise`\<`boolean`\>

Defined in: packages/common/pipes/file/file-validator.interface.ts:19

Indicates if this file should be considered valid, according to the options passed in the constructor.

#### Parameters

##### file?

the file from the request object

`TFile` | `TFile`[] | `Record`\<`string`, `TFile`[]\>

#### Returns

`boolean` \| `Promise`\<`boolean`\>
