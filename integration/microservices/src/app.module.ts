import { Module, Injectable } from '@nestjs/common';
import { AppController } from './app.controller';
import {
  ClientsModule,
  Transport,
  ClientsModuleOptionsFactory,
  ClientOptions,
} from '@nestjs/microservices';

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
    ]),
  ],
  controllers: [AppController],
})
export class ApplicationModule {}
