import {
  Module,
  MiddlewaresConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
  mergeSchemas,
} from 'graphql-tools';
import { GraphQLModule, GraphQLFactory } from '@nestjs/graphql';

import { CatsModule } from './cats/cats.module';

@Module({
  modules: [CatsModule, GraphQLModule],
})
export class ApplicationModule {
  constructor(private readonly graphQLFactory: GraphQLFactory) {}

  configure(consumer: MiddlewaresConsumer) {
    const schema = this.createSchema();
    consumer
      .apply(graphiqlExpress({ endpointURL: '/graphql' }))
      .forRoutes({ path: '/graphiql', method: RequestMethod.GET })
      .apply(graphqlExpress(req => ({ schema, rootValue: req })))
      .forRoutes({ path: '/graphql', method: RequestMethod.ALL });
  }

  createSchema() {
    const typeDefs = this.graphQLFactory.mergeTypesByPaths('./**/*.graphql');
    const schema = this.graphQLFactory.createSchema({ typeDefs });

    const delegates = this.graphQLFactory.createDelegates();
    const { humanSchema, linkTypeDefs } = this.createDelegatedSchema();
    return mergeSchemas({
      schemas: [schema, humanSchema, linkTypeDefs],
      resolvers: delegates,
    });
  }

  createDelegatedSchema() {
    const linkTypeDefs = `
      extend type Cat {
        human: Human
      }
    `;
    const humanSchema = makeExecutableSchema({
      typeDefs: `
        type Human {
          id: ID!
        }
        type Query {
          humanById(id: ID!): Human
        }
      `,
    });
    addMockFunctionsToSchema({ schema: humanSchema });
    return { humanSchema, linkTypeDefs };
  }
}
