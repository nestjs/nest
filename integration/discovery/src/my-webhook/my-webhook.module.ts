import { Module } from '@nestjs/common';
import { CleanupWebhook } from './cleanup.webhook';
import { FlushWebhook } from './flush.webhook';

@Module({ providers: [CleanupWebhook, FlushWebhook] })
export class MyWebhookModule {}
