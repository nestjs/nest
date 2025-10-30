# Interface: ParseFileOptions

Defined in: packages/common/pipes/file/parse-file-options.interface.ts:7

## Public Api

## Properties

### errorHttpStatusCode?

> `optional` **errorHttpStatusCode**: `ErrorHttpStatusCode`

Defined in: packages/common/pipes/file/parse-file-options.interface.ts:9

***

### exceptionFactory()?

> `optional` **exceptionFactory**: (`error`) => `any`

Defined in: packages/common/pipes/file/parse-file-options.interface.ts:10

#### Parameters

##### error

`string`

#### Returns

`any`

***

### fileIsRequired?

> `optional` **fileIsRequired**: `boolean`

Defined in: packages/common/pipes/file/parse-file-options.interface.ts:16

Defines if file parameter is required.

#### Default

```ts
true
```

***

### validators?

> `optional` **validators**: [`FileValidator`](../classes/FileValidator.md)\<`Record`\<`string`, `any`\>, `IFile`\>[]

Defined in: packages/common/pipes/file/parse-file-options.interface.ts:8
