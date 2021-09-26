import { Injectable } from '@nestjs/common';

@Injectable()
export class HostArrayService {
  greeting(): string {
    return 'Host Greeting!';
  }
}
