# Interface: ValidationError

Defined in: packages/common/interfaces/external/validation-error.interface.ts:9

Validation error description.

## See

https://github.com/typestack/class-validator

class-validator@0.13.0

## Public Api

## Properties

### children?

> `optional` **children**: `ValidationError`[]

Defined in: packages/common/interfaces/external/validation-error.interface.ts:35

Contains all nested validation errors of the property.

***

### constraints?

> `optional` **constraints**: `object`

Defined in: packages/common/interfaces/external/validation-error.interface.ts:29

Constraints that failed validation with error messages.

#### Index Signature

\[`type`: `string`\]: `string`

***

### contexts?

> `optional` **contexts**: `object`

Defined in: packages/common/interfaces/external/validation-error.interface.ts:39

A transient set of data passed through to the validation result for response mapping

#### Index Signature

\[`type`: `string`\]: `any`

***

### property

> **property**: `string`

Defined in: packages/common/interfaces/external/validation-error.interface.ts:19

Object's property that hasn't passed validation.

***

### target?

> `optional` **target**: `Record`\<`string`, `any`\>

Defined in: packages/common/interfaces/external/validation-error.interface.ts:15

Object that was validated.

OPTIONAL - configurable via the ValidatorOptions.validationError.target option

***

### value?

> `optional` **value**: `any`

Defined in: packages/common/interfaces/external/validation-error.interface.ts:25

Value that haven't pass a validation.

OPTIONAL - configurable via the ValidatorOptions.validationError.value option
