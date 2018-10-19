import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { CircularService } from './circular.service';

@Injectable()
export class InputService {
  @Inject(forwardRef(() => CircularService))
  public readonly service: CircularService;
}
