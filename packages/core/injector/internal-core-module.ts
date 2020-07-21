import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  ValueProvider,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common/interfaces';
import { requestProvider } from '../router/request/request-providers';
import { Reflector } from '../services';
import { inquirerProvider } from './inquirer/inquirer-providers';

function poweredByNestJSMiddleware(_, res, next) {
  res.setHeader('X-Powered-By', 'NestJS');
  next();
}

@Global()
@Module({
  providers: [Reflector, requestProvider, inquirerProvider],
  exports: [Reflector, requestProvider, inquirerProvider],
})
export class InternalCoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(poweredByNestJSMiddleware).forRoutes('*');
  }

  static register(providers: ValueProvider[]): DynamicModule {
    return {
      module: InternalCoreModule,
      providers: [...providers],
      exports: [...providers.map(item => item.provide)],
    };
  }
}
