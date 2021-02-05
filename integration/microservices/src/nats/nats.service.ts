import { Inject, Injectable } from '@nestjs/common';
import { CONTEXT } from '@nestjs/microservices';

@Injectable()
export class NatsService {
  constructor(@Inject(CONTEXT) public ctx) {}
}
