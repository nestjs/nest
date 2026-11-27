### Prisma GraphQL schema first sample

This sample project uses sqlite as the relational database. To use a different database, check the [Prisma docs](https://www.prisma.io/docs/getting-started).

### Installation

1. Install dependencies: `npm install`
2. Generate Prisma Client: `npx prisma generate`
3. Create sqlite database and create tables: `npx prisma db push`
4. Start server: `npm run start:dev`

The TypeScript type definitions for the GraphQL schema (`src/graphql.schema.ts`) are committed. After changing `src/posts/schema.graphql`, regenerate them with `npm run generate:typings`.

### GraphiQL

When the application is running, you can go to [http://localhost:3000/graphql](http://localhost:3000/graphql) to open GraphiQL. See [here](https://docs.nestjs.com/graphql/quick-start#graphql-ide) for more.