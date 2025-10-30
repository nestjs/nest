# Function: UploadedFile()

Route handler parameter decorator. Extracts the `file` object
and populates the decorated parameter with the value of `file`.
Used in conjunction with
[multer middleware](https://github.com/expressjs/multer) for Express-based applications.

For example:
```typescript
uploadFile(@UploadedFile() file) {
  console.log(file);
}
```

## See

[Request object](https://docs.nestjs.com/techniques/file-upload)

## Public Api

## Call Signature

> **UploadedFile**(): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:184

Route handler parameter decorator. Extracts the `file` object
and populates the decorated parameter with the value of `file`.
Used in conjunction with
[multer middleware](https://github.com/expressjs/multer) for Express-based applications.

For example:
```typescript
uploadFile(@UploadedFile() file) {
  console.log(file);
}
```

### Returns

`ParameterDecorator`

### See

[Request object](https://docs.nestjs.com/techniques/file-upload)

### Public Api

## Call Signature

> **UploadedFile**(...`pipes`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:201

Route handler parameter decorator. Extracts the `file` object
and populates the decorated parameter with the value of `file`.
Used in conjunction with
[multer middleware](https://github.com/expressjs/multer) for Express-based applications.

For example:
```typescript
uploadFile(@UploadedFile() file) {
  console.log(file);
}
```

### Parameters

#### pipes

...([`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\> \| [`Type`](../interfaces/Type.md)\<[`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>\>)[]

### Returns

`ParameterDecorator`

### See

[Request object](https://docs.nestjs.com/techniques/file-upload)

### Public Api

## Call Signature

> **UploadedFile**(`fileKey?`, ...`pipes?`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:221

Route handler parameter decorator. Extracts the `file` object
and populates the decorated parameter with the value of `file`.
Used in conjunction with
[multer middleware](https://github.com/expressjs/multer) for Express-based applications.

For example:
```typescript
uploadFile(@UploadedFile() file) {
  console.log(file);
}
```

### Parameters

#### fileKey?

`string`

#### pipes?

...([`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\> \| [`Type`](../interfaces/Type.md)\<[`PipeTransform`](../interfaces/PipeTransform.md)\<`any`, `any`\>\>)[]

### Returns

`ParameterDecorator`

### See

[Request object](https://docs.nestjs.com/techniques/file-upload)

### Public Api
