import { Webhook, WebhookHandler } from '../decorators/webhook.decorators';

@Webhook({ name: 'flush' })
export class FlushWebhook {
  @WebhookHandler({ event: 'start' })
  onStart() {
    console.log('flush started');
  }
}
