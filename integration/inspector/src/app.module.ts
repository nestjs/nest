import { Module, Scope } from '@nestjs/common';
import { AppV1Controller } from './app-v1.controller';
import { AppV2Controller } from './app-v2.controller';
import { CatsModule } from './cats/cats.module';
import { ChatModule } from './chat/chat.module';
import { HelloModule as CircularHelloModule } from './circular-hello/hello.module';
import { HelloService } from './circular-hello/hello.service';
import { InputModule } from './circular-modules/input.module';
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './database/database.module';
import { DogsModule } from './dogs/dogs.module';
import { DurableModule } from './durable/durable.module';
import { ExternalSvcModule } from './external-svc/external-svc.module';
import { PropertiesModule } from './properties/properties.module';
import { RequestChainModule } from './request-chain/request-chain.module';
import { UsersModule } from './users/users.module';

class Meta {
  static COUNTER = 0;
  constructor(private readonly helloService: HelloService) {
    Meta.COUNTER++;
  }
}

@Module({
  imports: [
    CoreModule,
    CatsModule,
    CircularHelloModule.forRoot({
      provide: 'META',
      useClass: Meta,
      scope: Scope.REQUEST,
    }),
    DurableModule,
    DogsModule,
    UsersModule,
    DatabaseModule,
    ExternalSvcModule,
    ChatModule,
    RequestChainModule,
    PropertiesModule,
    InputModule,
  ],
  controllers: [AppV1Controller, AppV2Controller],
})
export class AppModule {}
