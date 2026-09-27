import { Injectable, Logger } from '@nestjs/common';
import type { Order } from '../orders/order.js';

/** Stand-in for your email provider's SDK. */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  async sendOrderConfirmation(order: Order): Promise<void> {
    this.logger.log(
      `Order confirmation for ${order.id} sent to ${order.userId}`,
    );
  }
}
