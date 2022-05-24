import { Module, Injectable } from '@nestjs/common';
import { AppController } from './app.controller';
import {
  ClientsModule,
  Transport,
  ClientsModuleOptionsFactory,
  ClientOptions,
  ClientTCP,
  RpcException,
} from '@nestjs/microservices';

class ErrorHandlingProxy extends ClientTCP {
  serializeError(err) {
    return new RpcException(err);
  }
}

@Injectable()
class ConfigService {
  private readonly config = {
    transport: Transport.TCP,
  };
  get(key: string) {
    return this.config[key];
  }
}

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
class ConfigModule {}

@Injectable()
class ClientOptionService implements ClientsModuleOptionsFactory {
  constructor(private readonly configService: ConfigService) {}
  createClientOptions(): Promise<ClientOptions> | ClientOptions {
    return {
      transport: this.configService.get('transport'),
      options: {},
    };
  }
}

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: 'USE_FACTORY_CLIENT',
        useFactory: (configService: ConfigService) => ({
          transport: configService.get('transport'),
          options: {},
        }),
        inject: [ConfigService],
      },
      {
        imports: [ConfigModule],
        name: 'USE_CLASS_CLIENT',
        useClass: ClientOptionService,
        inject: [ConfigService],
      },
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: 'CUSTOM_PROXY_CLIENT',
        useFactory: (config: ConfigService) => ({
          customClass: ErrorHandlingProxy,
        }),
      },
    ]),
  ],
  controllers: [AppController],
})
export class AppModule {}
