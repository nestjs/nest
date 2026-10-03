import { Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { IncomingWebhook, VerifyWebhook, Webhooks } from '@nestjs/webhooks';
import type { Database } from '../database/drizzle.js';
import { OrdersService } from '../orders/orders.service.js';

/** The carrier's payload, Stripe-like: the event's `id` is in the body, which is what the signature covers. */
export interface CarrierEvent {
  id: string;
  type: 'shipment.shipped' | 'shipment.delivered';
  data: { orderId: string; trackingNumber: string };
}

@Controller('webhooks/carrier')
export class CarrierWebhooksController {
  private readonly logger = new Logger(CarrierWebhooksController.name);

  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly ordersService: OrdersService,
    private readonly webhooks: Webhooks,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @VerifyWebhook('carrier')
  async receive(@IncomingWebhook() webhook: IncomingWebhook<CarrierEvent>) {
    const { type, data } = webhook.payload;
    if (type !== 'shipment.shipped') {
      this.logger.log(`Ignoring ${type} for order ${data.orderId}`);
      return;
    }
    // One transaction: the order's status, the partner's order.shipped webhook (through the
    // outbox) and this webhook's inbox record commit together, or not at all.
    const result = await this.db.transaction(async tx =>
      webhook.processInTransaction(tx, () =>
        this.ordersService.markShipped(tx, data.orderId, data.trackingNumber),
      ),
    );
    if (result.duplicate) {
      return;
    }
    this.webhooks.notify(); // deliver order.shipped now instead of at the next poll
    this.logger.log(
      `Order ${data.orderId} shipped, tracking ${data.trackingNumber}`,
    );
  }
}
