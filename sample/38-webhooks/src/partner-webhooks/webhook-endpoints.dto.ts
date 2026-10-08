import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

/** Body of `POST /partner/webhook-endpoints`. The package checks the URL and the types themselves. */
export class CreateEndpointDto {
  @IsString()
  url: string;

  /** `order.shipped`, `order.cancelled`, or `*` for both. */
  @IsArray()
  @IsString({ each: true })
  eventTypes: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

/** Body of `PATCH /partner/webhook-endpoints/:id`: only what is sent changes. */
export class UpdateEndpointDto {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
