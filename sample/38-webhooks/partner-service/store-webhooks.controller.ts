import { Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { IncomingWebhook, VerifyWebhook } from '@nestjs/webhooks';

/** What the store sends: the Standard Webhooks payload, `type`, `timestamp` and `data`. */
export type StoreEvent =
  | {
      type: 'order.shipped';
      timestamp: string;
      data: { orderId: string; trackingNumber: string };
    }
  | {
      type: 'order.cancelled';
      timestamp: string;
      data: { orderId: string; reason: string };
    };

@Controller('store')
export class StoreWebhooksController {
  private readonly logger = new Logger(StoreWebhooksController.name);

  @Post('webhooks')
  @HttpCode(HttpStatus.NO_CONTENT)
  @VerifyWebhook('store')
  receive(@IncomingWebhook() webhook: IncomingWebhook<StoreEvent>) {
    const event = webhook.payload;
    if (event.type === 'order.shipped') {
      this.logger.log(
        `Order ${event.data.orderId} shipped, tracking ${event.data.trackingNumber} (${webhook.id})`,
      );
    } else {
      this.logger.log(
        `Order ${event.data.orderId} cancelled: ${event.data.reason} (${webhook.id})`,
      );
    }
  }
}
