## Mongoose base sample

### Installation


`npm install`

### Running

This example requires docker or a local mongodb installation.  If using a local mongodb, see `src/database/database.providers.ts` for the connection string (`mongodb://localhost/test`), and make sure it matches the mongodb installation.

#### Docker

There is a `docker-compose.yml` file for starting Docker.

`docker compose up`

After running the sample, you can stop the Docker container with

`docker compose down`

### Run the sample

Then, run Nest as usual:

`npm run start`