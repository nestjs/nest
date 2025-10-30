# Class: ParseFilePipeBuilder

Defined in: packages/common/pipes/file/parse-file-pipe.builder.ts:16

## Public Api

## Constructors

### Constructor

> **new ParseFilePipeBuilder**(): `ParseFilePipeBuilder`

#### Returns

`ParseFilePipeBuilder`

## Methods

### addFileTypeValidator()

> **addFileTypeValidator**(`options`): `ParseFilePipeBuilder`

Defined in: packages/common/pipes/file/parse-file-pipe.builder.ts:23

#### Parameters

##### options

[`FileTypeValidatorOptions`](../type-aliases/FileTypeValidatorOptions.md)

#### Returns

`ParseFilePipeBuilder`

***

### addMaxSizeValidator()

> **addMaxSizeValidator**(`options`): `ParseFilePipeBuilder`

Defined in: packages/common/pipes/file/parse-file-pipe.builder.ts:19

#### Parameters

##### options

[`MaxFileSizeValidatorOptions`](../type-aliases/MaxFileSizeValidatorOptions.md)

#### Returns

`ParseFilePipeBuilder`

***

### addValidator()

> **addValidator**(`validator`): `ParseFilePipeBuilder`

Defined in: packages/common/pipes/file/parse-file-pipe.builder.ts:27

#### Parameters

##### validator

[`FileValidator`](FileValidator.md)

#### Returns

`ParseFilePipeBuilder`

***

### build()

> **build**(`additionalOptions?`): [`ParseFilePipe`](ParseFilePipe.md)

Defined in: packages/common/pipes/file/parse-file-pipe.builder.ts:32

#### Parameters

##### additionalOptions?

`Omit`\<[`ParseFileOptions`](../interfaces/ParseFileOptions.md), `"validators"`\>

#### Returns

[`ParseFilePipe`](ParseFilePipe.md)
