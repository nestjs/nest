import { Module } from '@nestjs/common';
import { OwnersService } from "./owners.service";

@Module({
  providers: [OwnersService],
})
export class OwnersModule {}
