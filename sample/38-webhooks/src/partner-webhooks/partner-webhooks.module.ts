import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { WebhookDeliveriesController } from './webhook-deliveries.controller.js';
import { WebhookEndpointsController } from './webhook-endpoints.controller.js';
import { WebhooksErrorFilter } from './webhooks-error.filter.js';

@Module({
  controllers: [WebhookEndpointsController, WebhookDeliveriesController],
  // Turns the package's errors (a refused URL, another partner's endpoint) into 4xx responses.
  providers: [{ provide: APP_FILTER, useClass: WebhooksErrorFilter }],
})
export class PartnerWebhooksModule {}
