import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  WebhookDeliveries,
  type WebhookDeliveryStatus,
} from '@nestjs/webhooks';
import {
  CurrentPartner,
  PartnerGuard,
  type Partner,
} from '../partners/partner.guard.js';
import { RetryDeliveriesDto } from './webhook-deliveries.dto.js';

/** A partner's delivery log: what was sent, how each attempt went, and a way to ask for it again. */
@Controller('partner/webhook-deliveries')
@UseGuards(PartnerGuard)
export class WebhookDeliveriesController {
  constructor(private readonly webhookDeliveries: WebhookDeliveries) {}

  /** Newest first. */
  @Get()
  list(
    @CurrentPartner() partner: Partner,
    @Query('endpointId') endpointId?: string,
    @Query('status') status?: WebhookDeliveryStatus,
    @Query('type') type?: string,
  ) {
    return this.webhookDeliveries.list({
      tenant: partner.id,
      endpointId,
      status,
      type,
    });
  }

  /** The delivery, the message that was sent, and every attempt: status code, duration, the start of the response. */
  @Get(':id')
  async get(@CurrentPartner() partner: Partner, @Param('id') id: string) {
    const delivery = await this.webhookDeliveries.get(id, {
      tenant: partner.id,
    });
    if (!delivery) {
      throw new NotFoundException(`Webhook delivery ${id} not found`);
    }
    return delivery;
  }

  /** Sends one delivery again, now, with the same webhook-id: a replay of a lost webhook, or a retry of a failed one. */
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retry(@CurrentPartner() partner: Partner, @Param('id') id: string) {
    return {
      retried: await this.webhookDeliveries.retry(id, { tenant: partner.id }),
    };
  }

  /** Retries every failed delivery, of one endpoint or all, since an outage began. */
  @Post('retry')
  @HttpCode(HttpStatus.OK)
  async retryFailed(
    @CurrentPartner() partner: Partner,
    @Body() dto: RetryDeliveriesDto,
  ) {
    const since = dto.since === undefined ? undefined : new Date(dto.since);
    const retried = await this.webhookDeliveries.retry(
      { endpointId: dto.endpointId, status: 'failed', since },
      { tenant: partner.id },
    );
    return { retried };
  }
}
