import {Controller, Get, Next, Post, Req, Res} from '@nestjs/common';
import {graphiqlExpress, graphqlExpress} from 'apollo-server-express';
import {schema} from './schema';

@Controller()
export class GraphqlController {
  constructor() {}

  @Post('graphql')
  public rootPostGraphQl(@Req() request, @Res() response, @Next() next) {
    graphqlExpress({
      schema,
      context: {user: request.user}
    })(request, response, next);
  }

  @Get('graphql')
  public rootGetGraphQl(@Req() request, @Res() response, @Next() next) {
    graphqlExpress({
      schema,
      context: {user: request.user}
    })(request, response, next);
  }

  @Get('graphiql')
  public rootGetGraphiQl(@Req() request, @Res() response, @Next() next) {
    graphiqlExpress({
      endpointURL: '/graphql'
    })(request, response, next);
  }
}
