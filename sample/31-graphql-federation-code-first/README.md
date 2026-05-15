# GraphQL Federation - Code First

A production-ready example of GraphQL Federation using Code First approach.

## Installation

Install dependencies for all applications:

```sh
cd users-application && npm install
cd ../posts-application && npm install
cd ../gateway && npm install
```

## Execution

### Development Mode

For development, the gateway will automatically generate a supergraph schema on startup:

```sh
# Start sub-graph applications first
cd users-application && npm run start
```

```sh
cd posts-application && npm run start
```

```sh
# The gateway will auto-generate supergraph.graphql on startup
cd gateway && npm run start
```

### Production Mode

For production, generate the supergraph schema beforehand:

```sh
# 1. Ensure sub-graphs are running
cd users-application && npm run start
cd ../posts-application && npm run start

# 2. Generate supergraph schema using Rover CLI (requires @apollo/rover installation)
cd ../gateway && npm run generate:supergraph:rover

# 3. Start the gateway with the static supergraph
npm run start:prod
```

## Supergraph Schema Generation

The gateway provides two methods for generating the supergraph schema:

1. **Local Generation (Development)**: `npm run generate:supergraph`
   - Generates a simplified supergraph for local development
   - Does not require Rover CLI

2. **Rover CLI Generation (Production)**: `npm run generate:supergraph:rover`
   - Uses Apollo Rover to compose the actual supergraph from running sub-graphs
   - Requires Rover CLI: `npm install -g @apollo/rover`
   - Recommended for production deployments

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
