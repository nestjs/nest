import { Module } from '@nestjs/common';
import { StockReservationHandler } from './stock-reservation.handler.js';

@Module({
  providers: [StockReservationHandler],
})
export class InventoryModule {}
