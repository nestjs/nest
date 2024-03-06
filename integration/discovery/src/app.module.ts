import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { MyWebhookModule } from './my-webhook/my-webhook.module';
import { WebhooksExplorer } from './webhooks.explorer';

@Module({
  imports: [MyWebhookModule, DiscoveryModule],
  providers: [WebhooksExplorer],
})
export class AppModule {}
