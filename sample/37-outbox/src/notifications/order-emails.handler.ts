import { Injectable } from '@nestjs/common';
import { OnOutboxMessage } from '@nestjs/outbox';
import type { Order } from '../orders/order.js';
import { MailerService } from './mailer.service.js';

@Injectable()
export class OrderEmailsHandler {
  constructor(private readonly mailerService: MailerService) {}

  // The consumer's inbox skips messages it has already handled.
  @OnOutboxMessage('order.placed', { consumer: 'order-confirmation-email' })
  async sendConfirmation(order: Order) {
    await this.mailerService.sendOrderConfirmation(order);
  }
}
