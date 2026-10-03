import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderLineDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

/** Body of `POST /orders`. The prices come from the catalog. */
export class PlaceOrderDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items: OrderLineDto[];
}

/** Body of `POST /orders/:id/cancel`. The reason goes to the partner, in `order.cancelled`. */
export class CancelOrderDto {
  @IsString()
  reason: string;
}
