import { Injectable } from '@nestjs/common';

@Injectable()
export class HostService {
  greeting(): string {
    return 'Host Greeting!';
  }
}
