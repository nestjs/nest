# Class: ValidationPipe

Defined in: packages/common/pipes/validation.pipe.ts:47

## See

[Validation](https://docs.nestjs.com/techniques/validation)

## Public Api

## Implements

- [`PipeTransform`](../interfaces/PipeTransform.md)\<`any`\>

## Constructors

### Constructor

> **new ValidationPipe**(`options?`): `ValidationPipe`

Defined in: packages/common/pipes/validation.pipe.ts:57

#### Parameters

##### options?

[`ValidationPipeOptions`](../interfaces/ValidationPipeOptions.md)

#### Returns

`ValidationPipe`

## Properties

### errorHttpStatusCode

> `protected` **errorHttpStatusCode**: `ErrorHttpStatusCode`

Defined in: packages/common/pipes/validation.pipe.ts:52

***

### exceptionFactory()

> `protected` **exceptionFactory**: (`errors`) => `any`

Defined in: packages/common/pipes/validation.pipe.ts:54

#### Parameters

##### errors

[`ValidationError`](../interfaces/ValidationError.md)[]

#### Returns

`any`

***

### expectedType

> `protected` **expectedType**: [`Type`](../interfaces/Type.md)\<`any`\> \| `undefined`

Defined in: packages/common/pipes/validation.pipe.ts:53

***

### isDetailedOutputDisabled?

> `protected` `optional` **isDetailedOutputDisabled**: `boolean`

Defined in: packages/common/pipes/validation.pipe.ts:49

***

### isTransformEnabled

> `protected` **isTransformEnabled**: `boolean`

Defined in: packages/common/pipes/validation.pipe.ts:48

***

### transformOptions

> `protected` **transformOptions**: `ClassTransformOptions` \| `undefined`

Defined in: packages/common/pipes/validation.pipe.ts:51

***

### validateCustomDecorators

> `protected` **validateCustomDecorators**: `boolean`

Defined in: packages/common/pipes/validation.pipe.ts:55

***

### validatorOptions

> `protected` **validatorOptions**: `ValidatorOptions`

Defined in: packages/common/pipes/validation.pipe.ts:50

## Methods

### createExceptionFactory()

> **createExceptionFactory**(): (`validationErrors`) => `unknown`

Defined in: packages/common/pipes/validation.pipe.ts:175

#### Returns

> (`validationErrors`): `unknown`

##### Parameters

###### validationErrors

[`ValidationError`](../interfaces/ValidationError.md)[] = `[]`

##### Returns

`unknown`

***

### flattenValidationErrors()

> `protected` **flattenValidationErrors**(`validationErrors`): `string`[]

Defined in: packages/common/pipes/validation.pipe.ts:279

#### Parameters

##### validationErrors

[`ValidationError`](../interfaces/ValidationError.md)[]

#### Returns

`string`[]

***

### isPrimitive()

> `protected` **isPrimitive**(`value`): `boolean`

Defined in: packages/common/pipes/validation.pipe.ts:268

#### Parameters

##### value

`unknown`

#### Returns

`boolean`

***

### loadTransformer()

> `protected` **loadTransformer**(`transformerPackage?`): `TransformerPackage`

Defined in: packages/common/pipes/validation.pipe.ts:96

#### Parameters

##### transformerPackage?

`TransformerPackage`

#### Returns

`TransformerPackage`

***

### loadValidator()

> `protected` **loadValidator**(`validatorPackage?`): `ValidatorPackage`

Defined in: packages/common/pipes/validation.pipe.ts:85

#### Parameters

##### validatorPackage?

`ValidatorPackage`

#### Returns

`ValidatorPackage`

***

### mapChildrenToValidationErrors()

> `protected` **mapChildrenToValidationErrors**(`error`, `parentPath?`): [`ValidationError`](../interfaces/ValidationError.md)[]

Defined in: packages/common/pipes/validation.pipe.ts:291

#### Parameters

##### error

[`ValidationError`](../interfaces/ValidationError.md)

##### parentPath?

`string`

#### Returns

[`ValidationError`](../interfaces/ValidationError.md)[]

***

### prependConstraintsWithParentProp()

> `protected` **prependConstraintsWithParentProp**(`parentPath`, `error`): [`ValidationError`](../interfaces/ValidationError.md)

Defined in: packages/common/pipes/validation.pipe.ts:315

#### Parameters

##### parentPath

`string`

##### error

[`ValidationError`](../interfaces/ValidationError.md)

#### Returns

[`ValidationError`](../interfaces/ValidationError.md)

***

### stripProtoKeys()

> `protected` **stripProtoKeys**(`value`): `void`

Defined in: packages/common/pipes/validation.pipe.ts:248

#### Parameters

##### value

`any`

#### Returns

`void`

***

### toEmptyIfNil()

> `protected` **toEmptyIfNil**\<`T`, `R`\>(`value`, `metatype`): `string` \| `object` \| `R`

Defined in: packages/common/pipes/validation.pipe.ts:228

#### Type Parameters

##### T

`T` = `any`

##### R

`R` = `T`

#### Parameters

##### value

`T`

##### metatype

`object` | [`Type`](../interfaces/Type.md)\<`unknown`\>

#### Returns

`string` \| `object` \| `R`

***

### toValidate()

> `protected` **toValidate**(`metadata`): `boolean`

Defined in: packages/common/pipes/validation.pipe.ts:185

#### Parameters

##### metadata

[`ArgumentMetadata`](../interfaces/ArgumentMetadata.md)

#### Returns

`boolean`

***

### transform()

> **transform**(`value`, `metadata`): `Promise`\<`any`\>

Defined in: packages/common/pipes/validation.pipe.ts:107

Method to implement a custom pipe.  Called with two parameters

#### Parameters

##### value

`any`

argument before it is received by route handler method

##### metadata

[`ArgumentMetadata`](../interfaces/ArgumentMetadata.md)

contains metadata about the value

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`PipeTransform`](../interfaces/PipeTransform.md).[`transform`](../interfaces/PipeTransform.md#transform)

***

### transformPrimitive()

> `protected` **transformPrimitive**(`value`, `metadata`): `any`

Defined in: packages/common/pipes/validation.pipe.ts:194

#### Parameters

##### value

`any`

##### metadata

[`ArgumentMetadata`](../interfaces/ArgumentMetadata.md)

#### Returns

`any`

***

### validate()

> `protected` **validate**(`object`, `validatorOptions?`): [`ValidationError`](../interfaces/ValidationError.md)[] \| `Promise`\<[`ValidationError`](../interfaces/ValidationError.md)[]\>

Defined in: packages/common/pipes/validation.pipe.ts:272

#### Parameters

##### object

`object`

##### validatorOptions?

`ValidatorOptions`

#### Returns

[`ValidationError`](../interfaces/ValidationError.md)[] \| `Promise`\<[`ValidationError`](../interfaces/ValidationError.md)[]\>
