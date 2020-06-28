import { DynamicModule, Module } from '@nestjs/common';
import { OwnersService } from "./owners.service";

@Module({
  providers: [OwnersService],
})
export class OwnersModule {
  static enableRequestScope(): DynamicModule {
    return {
      module: OwnersModule,
      providers: [OwnersService],
    };
  }
}
