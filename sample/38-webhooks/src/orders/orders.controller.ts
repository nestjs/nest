import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentPartner,
  PartnerGuard,
  type Partner,
} from '../partners/partner.guard.js';
import { CancelOrderDto, PlaceOrderDto } from './orders.dto.js';
import { OrdersService } from './orders.service.js';

/** A partner's orders. Every call is scoped to the partner: another partner's order is a 404. */
@Controller('orders')
@UseGuards(PartnerGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  place(@CurrentPartner() partner: Partner, @Body() dto: PlaceOrderDto) {
    return this.ordersService.placeOrder(partner, dto);
  }

  @Get(':id')
  get(@CurrentPartner() partner: Partner, @Param('id') id: string) {
    return this.ordersService.getOrder(partner, id);
  }

  /** Sends `order.cancelled` to the partner's endpoints once the cancellation commits. */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentPartner() partner: Partner,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(partner, id, dto.reason);
  }
}
