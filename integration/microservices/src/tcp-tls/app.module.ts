import { Injectable, Module } from '@nestjs/common';
import {
  ClientOptions,
  ClientsModule,
  ClientsModuleOptionsFactory,
  ClientTCP,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { AppController } from './app.controller';

import * as fs from 'fs';
import * as path from 'path';

const caCert = fs.readFileSync(path.join(__dirname, 'ca.cert.pem')).toString();

class ErrorHandlingProxy extends ClientTCP {
  constructor() {
    super({
      tlsOptions: { ca: caCert },
    });
  }

  serializeError(err) {
    return new RpcException(err);
  }
}

@Injectable()
class ConfigService {
  private readonly config = {
    transport: Transport.TCP,
  };
  get(key: string, defaultValue?: any) {
    return this.config[key] || defaultValue;
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
      options: {
        tlsOptions: { ca: caCert },
      },
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
          options: {
            tlsOptions: { ca: caCert },
          },
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
export class ApplicationModule {}
