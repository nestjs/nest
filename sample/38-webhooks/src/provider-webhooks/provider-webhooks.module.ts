import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { CarrierWebhooksController } from './carrier-webhooks.controller.js';
import { PaymentProviderWebhooksController } from './payment-provider-webhooks.controller.js';

/** The webhooks the store receives: the payment provider's payments and the carrier's shipments. */
@Module({
  imports: [OrdersModule],
  controllers: [PaymentProviderWebhooksController, CarrierWebhooksController],
})
export class ProviderWebhooksModule {}
