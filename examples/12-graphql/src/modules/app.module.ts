import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {GraphqlModule} from './graphql/graphql.module';

@Module({
  modules: [
    GraphqlModule
  ],
  controllers: [
    AppController
  ],
  components: [],
})
export class ApplicationModule {}
