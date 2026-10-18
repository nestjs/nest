# File Upload

This sample demonstrates multipart file uploads with `FileInterceptor` and file validation with `ParseFilePipeBuilder`.

## Execution

From the repository root:

```sh
cd sample/29-file-upload
npm install
npm run start # OR npm run start:dev
```

## Requests

Run the following commands in another terminal from `sample/29-file-upload`.
The `--include` option displays the HTTP status and response headers.

### Upload without validation

```sh
curl --include http://localhost:3000/file \
  -F 'file=@./package.json' \
  -F 'name=test'
```

Expected status: `201 Created`. The response contains the form fields in `body`
and the file contents as a string in `file`.

### Upload a file that passes validation

```sh
curl --include http://localhost:3000/file/pass-validation \
  -F 'file=@./resources/nestjs.jpg' \
  -F 'name=test'
```

Expected status: `201 Created`. The configured `fileType: 'jpeg'` matches the
JPEG MIME type, `image/jpeg`. By default, `FileTypeValidator` detects the type
from the file contents; changing a file's extension does not make it valid.

### Upload a file that fails validation

```sh
curl --include http://localhost:3000/file/fail-validation \
  -F 'file=@./package.json' \
  -F 'name=test'
```

Expected status: `400 Bad Request`. The uploaded JSON file fails file type
validation. This endpoint deliberately uses `fileType: 'jpg'`, which does not
match `image/jpeg`, so uploading `resources/nestjs.jpg` here also fails.

### Omit an optional file

The `/file/pass-validation` endpoint sets `fileIsRequired: false`, so it also
accepts requests without a file:

```sh
curl --include http://localhost:3000/file/pass-validation -F 'name=test'
```

Expected status: `201 Created`, with the response below. The `file` property is
omitted when no file is uploaded.

```json
{ "body": { "name": "test" } }
```

### Omit a required file

The `/file/fail-validation` endpoint requires a file by default:

```sh
curl --include http://localhost:3000/file/fail-validation -F 'name=test'
```

Expected status: `400 Bad Request`, with the message `File is required`.
