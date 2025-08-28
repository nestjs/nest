import { GraphQLDefinitionsFactory } from '@nestjs/graphql';
import { join } from 'path';

const definitionsFactory = new GraphQLDefinitionsFactory();
definitionsFactory.generate({
  typePaths: ['./supergraph.graphql'],
  path: join(process.cwd(), 'src/graphql.schema.ts'),
  outputAs: 'interface',
  skipResolverArgs: true,
  federation: true,
});
