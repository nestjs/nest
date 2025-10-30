# Class: ParseFilePipe

Defined in: packages/common/pipes/file/parse-file.pipe.ts:20

Defines the built-in ParseFile Pipe. This pipe can be used to validate incoming files
with `@UploadedFile()` decorator. You can use either other specific built-in validators
or provide one of your own, simply implementing it through FileValidator interface
and adding it to ParseFilePipe's constructor.

## See

[Built-in Pipes](https://docs.nestjs.com/pipes#built-in-pipes)

## Public Api

## Implements

- [`PipeTransform`](../interfaces/PipeTransform.md)\<`any`\>

## Constructors

### Constructor

> **new ParseFilePipe**(`options`): `ParseFilePipe`

Defined in: packages/common/pipes/file/parse-file.pipe.ts:25

#### Parameters

##### options

[`ParseFileOptions`](../interfaces/ParseFileOptions.md) = `{}`

#### Returns

`ParseFilePipe`

## Properties

### exceptionFactory()

> `protected` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/file/parse-file.pipe.ts:21

#### Parameters

##### error

`string`

#### Returns

`any`

## Methods

### getValidators()

> **getValidators**(): [`FileValidator`](FileValidator.md)\<`Record`\<`string`, `any`\>, `IFile`\>[]

Defined in: packages/common/pipes/file/parse-file.pipe.ts:87

#### Returns

[`FileValidator`](FileValidator.md)\<`Record`\<`string`, `any`\>, `IFile`\>[]

list of validators used in this pipe.

***

### transform()

> **transform**(`value`): `Promise`\<`any`\>

Defined in: packages/common/pipes/file/parse-file.pipe.ts:41

Method to implement a custom pipe.  Called with two parameters

#### Parameters

##### value

`any`

argument before it is received by route handler method

#### Returns

`Promise`\<`any`\>

#### Implementation of

[`PipeTransform`](../interfaces/PipeTransform.md).[`transform`](../interfaces/PipeTransform.md#transform)

***

### validate()

> `protected` **validate**(`file`): `Promise`\<`any`\>

Defined in: packages/common/pipes/file/parse-file.pipe.ts:68

#### Parameters

##### file

`any`

#### Returns

`Promise`\<`any`\>
