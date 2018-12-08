import { DynamicModule } from '@nestjs/common';
import { InputService } from './input.service';

export class CircularModule {
  static forRoot(): DynamicModule {
    const a = {
      module: CircularModule,
      providers: [InputService],
      b: null,
    };
    a.b = a;
    return a;
  }
}
