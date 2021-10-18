# File Upload

A simple example of file upload

## Execution

```sh
npm run start # OR npm run start:dev
# in another terminal
curl http://localhost:3000/file -F 'file=@./package.json' -F 'name=test'
```