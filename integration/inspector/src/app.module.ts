import { Module, Scope } from '@nestjs/common';
import { AppV1Controller } from './app-v1.controller.js';
import { AppV2Controller } from './app-v2.controller.js';
import { CatsModule } from './cats/cats.module.js';
import { ChatModule } from './chat/chat.module.js';
import { HelloModule as CircularHelloModule } from './circular-hello/hello.module.js';
import { HelloService } from './circular-hello/hello.service.js';
import { InputModule } from './circular-modules/input.module.js';
import { CoreModule } from './core/core.module.js';
import { DatabaseModule } from './database/database.module.js';
import { DogsModule } from './dogs/dogs.module.js';
import { DurableModule } from './durable/durable.module.js';
import { ExternalSvcModule } from './external-svc/external-svc.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { RequestChainModule } from './request-chain/request-chain.module.js';
import { UsersModule } from './users/users.module.js';

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
