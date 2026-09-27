import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service.js';
import { OrderEmailsHandler } from './order-emails.handler.js';

@Module({
  // @OnOutboxMessage() handlers are discovered on providers.
  providers: [MailerService, OrderEmailsHandler],
})
export class NotificationsModule {}
