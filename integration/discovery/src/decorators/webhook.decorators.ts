import { DiscoveryService } from '@nestjs/core';

export const Webhook = DiscoveryService.createDecorator<{ name: string }>();
export const WebhookHandler = DiscoveryService.createDecorator<{
  event: string;
}>();
