import { DynamicModule, Module } from '@nest/core';

import { MoreNestModule } from './more-nest';
import { LessNestModule } from './less-nest';
import { NestService } from './nest.service';

@Module()
export class NestModule {
  public static forRoot(): Promise<DynamicModule> {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('NestModule#forRoot');
        resolve({
          module: NestModule,
          imports: [LessNestModule, MoreNestModule],
          providers: [NestService],
          exports: [MoreNestModule, NestService],
        });
      }, 500);
    });
  }
}
