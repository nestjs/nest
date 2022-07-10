import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  public getTtl(): number {
    return 10;
  }
}
