import { Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { IncomingWebhook, VerifyWebhook } from '@nestjs/webhooks';
import type { Database } from '../database/drizzle.js';
import { OrdersService } from '../orders/orders.service.js';

/** The payment provider's payload: the Standard Webhooks shape, `type`, `timestamp` and `data`. */
export interface PaymentProviderEvent {
  type: 'payment.succeeded' | 'payment.failed';
  timestamp: string;
  data: { paymentId: string; orderId: string; amount: number };
}

@Controller('webhooks/payments')
export class PaymentProviderWebhooksController {
  private readonly logger = new Logger(PaymentProviderWebhooksController.name);

  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @VerifyWebhook('payments')
  async receive(
    @IncomingWebhook() webhook: IncomingWebhook<PaymentProviderEvent>,
  ) {
    const { type, data } = webhook.payload;
    if (type !== 'payment.succeeded') {
      this.logger.log(`Ignoring ${type} for order ${data.orderId}`);
      return;
    }
    // Exactly once: the webhook's id is recorded in the same transaction as the order's new
    // status, so a redelivery, even one racing this request on another instance, changes nothing.
    const result = await this.db.transaction(async tx =>
      webhook.processInTransaction(tx, () =>
        this.ordersService.markPaid(
          tx,
          data.orderId,
          data.paymentId,
          data.amount,
        ),
      ),
    );
    if (!result.duplicate) {
      this.logger.log(
        `Order ${data.orderId} paid: ${data.paymentId}, ${data.amount} cents`,
      );
    }
  }
}
