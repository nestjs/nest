import { NestEnvironment } from '@nestjs/common/enums/nest-environment.enum';

export interface TestOptions {
  logging: NestEnvironment;
}
