### Queues sample

`POST /audio/transcode` adds a `transcode` job to the `audio` queue, and `AudioProcessor` handles it in the background and logs the job. The queue uses Bull through `@nestjs/bull`, which needs Redis. See the [queues](https://docs.nestjs.com/application/queues) chapter for more.

### Installation

`npm install`

### Running

There is a `docker-compose.yml` file that starts Redis on port 6379:

`docker compose up`

To use another Redis server, set `REDIS_HOST` and `REDIS_PORT` (defaults: `localhost` and `6379`). Then start the application, which listens on port 3000:

`npm run start:dev`

```bash
curl -X POST localhost:3000/audio/transcode
```

### Test

```bash
# unit tests
npm run test

# e2e tests (need Redis)
npm run test:e2e
```
