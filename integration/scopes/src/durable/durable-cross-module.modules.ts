import { forwardRef, Module } from '@nestjs/common';
import { DurableElephantsService } from './durable-elephants.service.js';
import { DurableLionsService } from './durable-lions.service.js';
import { tenantConnectionProvider } from './durable-tenant-connection.provider.js';
import { DurableZooService } from './durable-zoo.service.js';

@Module({
  imports: [forwardRef(() => DurableLionsModule)],
  providers: [tenantConnectionProvider, DurableElephantsService],
  exports: [DurableElephantsService],
})
export class DurableElephantsModule {}

@Module({
  imports: [forwardRef(() => DurableElephantsModule)],
  providers: [tenantConnectionProvider, DurableLionsService],
  exports: [DurableLionsService],
})
export class DurableLionsModule {}

@Module({
  imports: [DurableElephantsModule],
  providers: [tenantConnectionProvider, DurableZooService],
  exports: [DurableZooService],
})
export class DurableZooModule {}
