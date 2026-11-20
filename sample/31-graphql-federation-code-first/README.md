# GraphQL Federation - Code First

A GraphQL Federation example using the code first approach: two sub-graphs, `users-application` and `posts-application`, behind an Apollo gateway. See the [federation](https://docs.nestjs.com/graphql/federation) chapter for more.

## Installation

Install dependencies for all applications:

```sh
cd users-application && npm install
cd ../posts-application && npm install
cd ../gateway && npm install
```

The gateway serves a supergraph composed with [Rover](https://www.apollographql.com/docs/rover): `npm install -g @apollo/rover`.

## Execution

Start each sub-graph in its own terminal. They listen on ports 3002 and 3003:

```sh
cd users-application && npm run start
```

```sh
cd posts-application && npm run start
```

Once both are running, compose the supergraph from them (see `gateway/supergraph.yaml`) and start the gateway. In a third terminal:

```sh
cd gateway
npm run generate:supergraph:rover
npm run build
npm run start:prod
```

Start the gateway with `start:prod`, as above. `npm run start` and `npm run start:dev` first run `npm run generate:supergraph`, which overwrites `supergraph.graphql` with a hand-written schema that the gateway can't load.

## Access the graph

You can reach the gateway under `http://localhost:3001/graphql`

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
