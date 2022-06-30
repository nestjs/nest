## GraphQL Federation - Code First
A simple example of a GraphQL server built with GraphQL Yoga using the Code First approach.

GraphQL Yoga is a Fully-featured GraphQL Server with a focus on easy setup, performance & great developer experience:

- **The easiest way to run a GraphQL server:** Sensible defaults & includes everything you need with minimal setup (we also export a platform/env-agnostic handler so you can build your wrappers quickly).
- **Includes Subscriptions:** Built-in support for GraphQL subscriptions using **S**erver-**S**ent **E**vents.
- **Compatible:** Works with all GraphQL clients (ex: Apollo, Relay) and seamlessly fits your GraphQL workflow.
- **WHATWG Fetch API:** the core package depends on [WHATWG Fetch API](https://fetch.spec.whatwg.org/) so it can run and deploy in any environment (Serverless, Workers, Deno, Node).
- **Easily Extendable:** New GraphQL-Yoga support all [`envelop`](https://www.envelop.dev) plugins.
- **[Nest](https://nestjs.com/) integration:** support for standalone GraphQL server, Apollo Federation (Gateway and service), and all Nest GraphQL features.

<p>&nbsp;</p>

---

<p>&nbsp;</p>

## Quick Start

<br/>

To get up and running

```sh
npm i

npm start
```

Then, open your favorite browser at [http://localhost:3000/graphql](http://localhost:3000/graphql), and try the following query:

```gql
{
  recipes {
    id
    description
  }
}
```

To add some data, feel free to edit the `sample/34-graphql-yoga/src/recipes/recipes.resolver.ts` file.
