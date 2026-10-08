import { Module } from '@nestjs/common';
import { OutboxModule } from '@nestjs/outbox';
import { WebhooksModule } from '@nestjs/webhooks';
import { StoreWebhooksController } from './store-webhooks.controller.js';

/**
 * Northside's side: a service that only receives. `outgoing: false` leaves out the
 * endpoints, deliveries and worker. The outbox's inbox deduplicates redeliveries by
 * webhook-id; in memory here, on the partner's own database in production (the outbox's
 * store, as in the outbox tutorial's analytics service).
 */
@Module({
  imports: [
    OutboxModule.forRoot({ relay: { enabled: false } }),
    WebhooksModule.forRootAsync({
      outgoing: false,
      useFactory: () => {
        const secrets = process.env.STORE_WEBHOOK_SECRET;
        if (!secrets) {
          throw new Error(
            'Set STORE_WEBHOOK_SECRET to the secret the store gave this endpoint',
          );
        }
        return {
          receivers: {
            // Every listed secret is tried: keep the old one next to the new one while the store rotates.
            store: { scheme: 'standard', secret: secrets.split(',') },
          },
        };
      },
    }),
  ],
  controllers: [StoreWebhooksController],
})
export class AppModule {}
