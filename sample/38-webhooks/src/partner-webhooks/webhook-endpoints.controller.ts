import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WebhookEndpoints } from '@nestjs/webhooks';
import {
  CurrentPartner,
  PartnerGuard,
  type Partner,
} from '../partners/partner.guard.js';
import {
  CreateEndpointDto,
  UpdateEndpointDto,
} from './webhook-endpoints.dto.js';

/** A partner's subscriptions. Every call is scoped to the partner: another partner's endpoint is a 404. */
@Controller('partner/webhook-endpoints')
@UseGuards(PartnerGuard)
export class WebhookEndpointsController {
  constructor(private readonly webhookEndpoints: WebhookEndpoints) {}

  /** Returns the endpoint and its secret. The secret is shown this once. */
  @Post()
  create(@CurrentPartner() partner: Partner, @Body() dto: CreateEndpointDto) {
    return this.webhookEndpoints.create({
      url: dto.url,
      eventTypes: dto.eventTypes,
      description: dto.description ?? null,
      tenant: partner.id,
    });
  }

  @Get()
  list(@CurrentPartner() partner: Partner) {
    return this.webhookEndpoints.list({ tenant: partner.id });
  }

  @Get(':id')
  async get(@CurrentPartner() partner: Partner, @Param('id') id: string) {
    const endpoint = await this.webhookEndpoints.get(id, {
      tenant: partner.id,
    });
    if (!endpoint) {
      throw new NotFoundException(`Webhook endpoint ${id} not found`);
    }
    return endpoint;
  }

  @Patch(':id')
  update(
    @CurrentPartner() partner: Partner,
    @Param('id') id: string,
    @Body() dto: UpdateEndpointDto,
  ) {
    return this.webhookEndpoints.update(id, dto, { tenant: partner.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentPartner() partner: Partner, @Param('id') id: string) {
    await this.webhookEndpoints.delete(id, { tenant: partner.id });
  }

  /** A new secret. The old one keeps signing for 24 hours, so the partner can switch without a gap. */
  @Post(':id/rotate-secret')
  @HttpCode(HttpStatus.OK)
  async rotateSecret(
    @CurrentPartner() partner: Partner,
    @Param('id') id: string,
  ) {
    return {
      secret: await this.webhookEndpoints.rotateSecret(id, {
        tenant: partner.id,
      }),
    };
  }
}
