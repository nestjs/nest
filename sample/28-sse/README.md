### Server-Sent Events sample

`GET /sse` is an `@Sse()` route that sends `{ "hello": "world" }` every second, and `GET /` serves a page that shows the events as they arrive. See the [server-sent events](https://docs.nestjs.com/http/server-sent-events) chapter for more.

### Installation

`npm install`

### Running

`npm run start:dev`

Open [http://localhost:3000](http://localhost:3000), or follow the stream with `curl -N localhost:3000/sse`.

### Test

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e
```
