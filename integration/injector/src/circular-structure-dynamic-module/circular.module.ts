import { DynamicModule } from '@nestjs/common';
import { InputService } from './input.service.js';

export class CircularModule {
  static forRoot(): DynamicModule {
    const a = {
      module: CircularModule,
      providers: [InputService],
      b: null as any,
    };
    a.b = a;
    return a;
  }
}
