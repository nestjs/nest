import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { CircularService } from './circular.service.js';

@Injectable()
export class InputService {
  constructor(
    @Inject(forwardRef(() => CircularService))
    public readonly service: CircularService,
  ) {}
}
