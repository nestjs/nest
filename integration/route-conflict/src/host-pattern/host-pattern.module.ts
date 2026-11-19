import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { TenantController } from './tenant.controller.js';

@Module({
  controllers: [TenantController, AdminController],
})
export class HostPatternModule {}
