import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { readFileSync } from 'fs';
import { join } from 'path';

// For development, you can use IntrospectAndCompose (not recommended for production)
// import { IntrospectAndCompose } from '@apollo/gateway';

const supergraphSdl = readFileSync(
  join(__dirname, '..', 'supergraph.graphql'),
  'utf-8',
).trim();

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl,
        // For development only - not recommended for production
        // supergraphSdl: new IntrospectAndCompose({
        //   subgraphs: [
        //     { name: 'users', url: 'http://localhost:3002/graphql' },
        //     { name: 'posts', url: 'http://localhost:3003/graphql' },
        //   ],
        // }),
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
