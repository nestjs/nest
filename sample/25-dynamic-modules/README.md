### Dynamic modules sample

`IdGeneratorModule.register()` returns a dynamic module configured by the module that imports it. `UsersModule` registers it with the `usr` prefix and `OrdersModule` with `ord`, so each gets its own `IdGenerator`. See the [dynamic modules](https://docs.nestjs.com/fundamentals/dynamic-modules) chapter for more.

### Installation

`npm install`

### Running

`npm run start:dev`

The application listens on port 3000. Users get ids like `usr_<uuid>` and orders like `ord_<uuid>`:

```bash
curl -X POST localhost:3000/users -H 'content-type: application/json' -d '{"name":"Ada"}'
curl -X POST localhost:3000/orders -H 'content-type: application/json' -d '{"product":"book"}'
curl localhost:3000/users
```

### Test

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e
```
