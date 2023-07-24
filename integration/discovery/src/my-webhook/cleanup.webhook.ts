import { Webhook, WebhookHandler } from '../decorators/webhook.decorators';

@Webhook({ name: 'cleanup' })
export class CleanupWebhook {
  @WebhookHandler({ event: 'start' })
  onStart() {
    console.log('cleanup started');
  }
}
