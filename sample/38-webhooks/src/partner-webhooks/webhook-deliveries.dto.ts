import { IsISO8601, IsOptional, IsString } from 'class-validator';

/** Body of `POST /partner/webhook-deliveries/retry`: every failed delivery since an outage began. */
export class RetryDeliveriesDto {
  /** One endpoint's, or every endpoint's. */
  @IsOptional()
  @IsString()
  endpointId?: string;

  /** Deliveries created at or after this time (ISO 8601): the start of the outage. */
  @IsOptional()
  @IsISO8601()
  since?: string;
}
