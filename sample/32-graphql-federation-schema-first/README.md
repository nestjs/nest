# GraphQL Federation - Schema First

A GraphQL Federation example using the schema first approach: two sub-graphs, `users-application` and `posts-application`, behind an Apollo gateway. See the [federation](https://docs.nestjs.com/graphql/federation) chapter for more.

## Installation

Install dependencies for all applications:

```sh
cd users-application && npm install
cd ../posts-application && npm install
cd ../gateway && npm install
```

The gateway serves a supergraph composed with [Rover](https://www.apollographql.com/docs/rover): `npm install -g @apollo/rover`.

## Execution

Start each sub-graph in its own terminal. They listen on ports 3000 and 3001:

```sh
cd users-application && npm run start
```

```sh
cd posts-application && npm run start
```

Compose the supergraph from the sub-graphs' `.graphql` files (see `gateway/supergraph.yaml`) and start the gateway. In a third terminal:

```sh
cd gateway
npm run generate:supergraph:rover
npm run build
npm run start:prod
```

Start the gateway with `start:prod`, as above. `npm run start` and `npm run start:dev` first run `npm run generate:supergraph`, which overwrites `supergraph.graphql` with a hand-written schema that the gateway can't load.

`npm run generate:typings` writes TypeScript definitions of the supergraph to `gateway/src/graphql.schema.ts`.

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
