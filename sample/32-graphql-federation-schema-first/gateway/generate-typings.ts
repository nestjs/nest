import { GraphQLDefinitionsFactory } from '@nestjs/graphql';
import { join } from 'node:path';

const definitionsFactory = new GraphQLDefinitionsFactory();
await definitionsFactory.generate({
  typePaths: ['./supergraph.graphql'],
  path: join(process.cwd(), 'src/graphql.schema.ts'),
  outputAs: 'interface',
  skipResolverArgs: true,
  federation: true,
});
