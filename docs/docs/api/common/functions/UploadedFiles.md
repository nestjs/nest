# Function: UploadedFiles()

Route handler parameter decorator. Extracts the `files` object
and populates the decorated parameter with the value of `files`.
Used in conjunction with
[multer middleware](https://github.com/expressjs/multer) for Express-based applications.

For example:
```typescript
uploadFile(@UploadedFiles() files) {
  console.log(files);
}
```

## See

[Request object](https://docs.nestjs.com/techniques/file-upload)

## Public Api

## Call Signature

> **UploadedFiles**(): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:267

Route handler parameter decorator. Extracts the `files` object
and populates the decorated parameter with the value of `files`.
Used in conjunction with
[multer middleware](https://github.com/expressjs/multer) for Express-based applications.

For example:
```typescript
uploadFile(@UploadedFiles() files) {
  console.log(files);
}
```

### Returns

`ParameterDecorator`

### See

[Request object](https://docs.nestjs.com/techniques/file-upload)

### Public Api

## Call Signature

> **UploadedFiles**(...`pipes`): `ParameterDecorator`

Defined in: packages/common/decorators/http/route-params.decorator.ts:284

Route handler parameter decorator. Extracts the `files` object
and populates the decorated parameter with the value of `files`.
Used in conjunction with
[multer middleware](https://github.com/expressjs/multer) for Express-based applications.

For example:
```typescript
uploadFile(@UploadedFiles() files) {
  console.log(files);
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
