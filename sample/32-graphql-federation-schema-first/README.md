# GraphQL Federation - Schema First

A GraphQL Federation example using the schema first approach: two sub-graphs, `users-application` and `posts-application`, behind an Apollo gateway. See the [federation](https://docs.nestjs.com/graphql/federation) chapter for more.

## Installation

Install dependencies for all applications:

```sh
cd users-application && npm install
cd ../posts-application && npm install
cd ../gateway && npm install
```

## Execution

Start each sub-graph in its own terminal. They listen on ports 3000 and 3001:

```sh
cd users-application && npm run start
```

```sh
cd posts-application && npm run start
```

Start the gateway in a third terminal:

```sh
cd gateway && npm run start
```

`npm run start` and `npm run start:dev` first run `npm run generate:supergraph`, which composes the sub-graphs' `.graphql` files into `gateway/supergraph.graphql`, the file the gateway serves, and `npm run generate:typings`, which writes TypeScript definitions of the supergraph to `gateway/src/graphql.schema.ts`. Restart the gateway after you change a sub-graph's schema.

To compose with [Rover](https://www.apollographql.com/docs/rover) instead (`npm install -g @apollo/rover`, configured in `gateway/supergraph.yaml`), run `npm run generate:supergraph:rover`, then `npm run build` and `npm run start:prod`. `start` and `start:dev` would overwrite the Rover output.

## Access the graph

You can reach the gateway under `http://localhost:3002/graphql`

## Query a combined graph

```gql
query getUserWithPosts($userId: ID!) {
  getUser(id: $userId) {
    id
    name
    posts {
      authorId
      id
      title
    }
  }
}
```
