import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { Webhook, WebhookHandler } from './decorators/webhook.decorators';

@Injectable()
export class WebhooksExplorer {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  getWebhooks() {
    const webhooks = this.discoveryService.getProviders({
      metadataKey: Webhook.KEY,
    });
    return webhooks.map(wrapper => {
      const { name } = this.discoveryService.getMetadataByDecorator(
        Webhook,
        wrapper,
      )!;
      return {
        name,
        handlers: this.metadataScanner
          .getAllMethodNames(wrapper.metatype!.prototype)
          .map(methodName => {
            const { event } = this.discoveryService.getMetadataByDecorator(
              WebhookHandler,
              wrapper,
              methodName,
            )!;
            return {
              methodName,
              event,
            };
          }),
      };
    });
  }
}
