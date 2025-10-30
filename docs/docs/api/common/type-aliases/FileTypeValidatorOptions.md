# Type Alias: FileTypeValidatorOptions

> **FileTypeValidatorOptions** = `object`

Defined in: packages/common/pipes/file/file-type.validator.ts:5

## Properties

### fallbackToMimetype?

> `optional` **fallbackToMimetype**: `boolean`

Defined in: packages/common/pipes/file/file-type.validator.ts:19

If `true`, and magic number check fails, fallback to mimetype comparison.

#### Default

```ts
false
```

***

### fileType

> **fileType**: `string` \| `RegExp`

Defined in: packages/common/pipes/file/file-type.validator.ts:6

***

### skipMagicNumbersValidation?

> `optional` **skipMagicNumbersValidation**: `boolean`

Defined in: packages/common/pipes/file/file-type.validator.ts:13

If `true`, the validator will skip the magic numbers validation.
This can be useful when you can't identify some files as there are no common magic numbers available for some file types.

#### Default

```ts
false
```
