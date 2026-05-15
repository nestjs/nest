import { Module } from '@nestjs/common';
import { CleanupWebhook } from './cleanup.webhook.js';
import { FlushWebhook } from './flush.webhook.js';

@Module({ providers: [CleanupWebhook, FlushWebhook] })
export class MyWebhookModule {}
