import { Module, Global, DynamicModule } from '@nestjs/common';
import { Reflector } from '../services/reflector.service';
import { NestApplicationContext } from './../nest-application-context';
import { APP_REF } from './tokens';

@Global()
@Module({
  components: [Reflector],
  exports: [Reflector],
})
export class HostProvidersModule {
  static extend<T extends NestApplicationContext>(
    applicationRef: T,
  ): DynamicModule {
    const providers = [
      {
        provide: APP_REF,
        useValue: applicationRef,
      },
    ];
    return {
      module: HostProvidersModule,
      components: providers,
      exports: providers,
    };
  }
}
