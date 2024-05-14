# gRPC - Client / Server

[nest/sample/04-grpc/hybrid/](https://github.com/nestjs/nest/tree/master/sample/04-grpc/hybrid/) is a hybrid application (HTTP + gRPC), where the gRPC client and gRPC server are written together as one program.

[nest/sample/04-grpc/client/](https://github.com/nestjs/nest/tree/master/sample/04-grpc/client/) & [nest/sample/04-grpc/server/](https://github.com/nestjs/nest/tree/master/sample/04-grpc/server/) use the [ts-proto](https://www.npmjs.com/package/ts-proto) package to convert proto files to TypeScript(NestJS).<br>
(ex, `protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=nestJs=true:. ./hero.proto`)<br>
Additionally, multiple proto [sample programs](https://github.com/grpc/grpc-node/tree/master/examples) written as separate clients/servers demonstrate compatibility with the sample programs in `@grpc/grpc-js`.

## Execution

The program source code already contains interface files generated from a `.proto` file, but if you create a new proto file yourself, you must do so via `npm run buill:proto:ts`.

```sh
cd server
npm run buill:proto:ts
npm run start
```

```sh
cd client
npm run buill:proto:ts
npm run start
```

## Compatibility

gRPC Client / gRPC Server that use the same [proto file](https://github.com/grpc/grpc-node/blob/master/examples/protos/helloworld.proto) are compatible with each other.<br>
(All gRPC Server ports are set to 50051.)

|                                                                                                             | gRPC Client                        | gRPC Server                        |
|-------------------------------------------------------------------------------------------------------------|------------------------------------|------------------------------------|
| [grpc-node/examples/helloworld/](https://github.com/grpc/grpc-node/tree/master/examples/helloworld)         | **c-1** `$ node greeter_client.js` | **s-1** `$ node greeter_server.js` |
| [grpc-node/examples/error_handling/](https://github.com/grpc/grpc-node/tree/master/examples/error_handling) | **c-2** `$ node client.js`         | **s-2** `$ node server.js`         |
| nest/sample/04-grpc/                                                                                        | **c-3** `client$ npm start`        | **s-3** `server$ npm start`        |

- **c-1** --> **s-1**, **s-3**
  ```shell
  $ node greeter_client.js
  Greeting: Hello world
  $ node greeter_client.js grpc
  Greeting: Hello grpc
  ```
- **c-2** --> **s-2**, **s-3**
  ```shell
  $ node client.js
  [1] Calling SayHello with name:""
  [1] Received error 3 INVALID_ARGUMENT: request missing required field: name
  [2] Calling SayHello with name:"<username>"
  [2] Received response Hello <username>
  [3] Calling SayHelloStreamReply with name:""
  [3] Received expected error 3 INVALID_ARGUMENT: request missing required field: name
  [3] Received status with code=INVALID_ARGUMENT details=request missing required field: name
  [4] Calling SayHelloStreamReply with name:"<username>"
  [4] Received response Hello <username>
  [4] Received response Hello <username>
  [4] Received response Hello <username>
  [4] Received response Hello <username>
  [4] Received response Hello <username>
  [4] Received status with code=OK details=OK
  ```
- **c-3** --> **s-1**
  ```shell
  $ curl http://localhost:3000/helloworld/unary/test1      
  Hello test1
  ```
- **c-3** --> **s-2**, **s-3**
  ```shell
  $ curl http://localhost:3000/helloworld/unary/test2      
  Hello test2
  $ curl http://localhost:3000/helloworld/streaming/test
  ["Hello test","Hello test","Hello test","Hello test","Hello test"]
  ```
- **c-3** --> **s-3**
  ```shell
  $ curl http://localhost:3000/hero/1           
  {"id":1,"name":"John"}
  $ curl http://localhost:3000/hero/2
  {"id":2,"name":"Doe"}
  $ curl http://localhost:3000/hero  
  [{"id":1,"name":"John"},{"id":2,"name":"Doe"}]
  ```
