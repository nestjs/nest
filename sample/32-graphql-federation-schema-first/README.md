# GraphQL Federation - Schema First

A production-ready example of GraphQL Federation using Schema First approach.

## Installation

Install dependencies for all applications:

```sh
cd users-application && npm install
cd ../posts-application && npm install
cd ../gateway && npm install
```

## Execution

### Development Mode

For development, the gateway will automatically generate a supergraph schema from local schema files:

```sh
# Start sub-graph applications first
cd users-application && npm run start
```

```sh
cd posts-application && npm run start
```

```sh
# The gateway will auto-generate supergraph.graphql and TypeScript types on startup
cd gateway && npm run start
```

### Production Mode

For production, generate the supergraph schema and types beforehand:

```sh
# 1. Ensure sub-graphs are running (for Rover CLI method)
cd users-application && npm run start
cd ../posts-application && npm run start

# 2. Generate supergraph schema using Rover CLI (requires @apollo/rover installation)
cd ../gateway && npm run generate:supergraph:rover

# 3. Generate TypeScript types from supergraph
npm run generate:typings

# 4. Start the gateway with the static supergraph
npm run start:prod
```

## Schema Generation

The gateway provides multiple generation scripts:

1. **Supergraph Generation (Local)**: `npm run generate:supergraph`
   - Composes supergraph from local `.graphql` files
   - Suitable for development when sub-graphs share the same repository

2. **Supergraph Generation (Rover)**: `npm run generate:supergraph:rover`
   - Uses Apollo Rover to compose supergraph from running sub-graphs
   - Requires Rover CLI: `npm install -g @apollo/rover`
   - Recommended for production deployments

3. **TypeScript Types Generation**: `npm run generate:typings`
   - Generates TypeScript interfaces from the supergraph schema
   - Provides type safety for resolvers and GraphQL operations

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
