import { Global, Module } from '@nestjs/common';
import { AsyncContext } from './async-context';

@Global()
@Module({
  providers: [
    {
      provide: AsyncContext,
      useValue: AsyncContext.instance,
    },
  ],
})
export class AsyncHooksModule {}
