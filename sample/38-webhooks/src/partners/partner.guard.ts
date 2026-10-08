import {
  createParamDecorator,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import type { Database } from '../database/drizzle.js';
import { partners } from '../database/schema.js';

export interface Partner {
  id: string;
  name: string;
}

/** Authenticates a partner by its API key: `Authorization: Bearer <key>`. */
@Injectable()
export class PartnerGuard implements CanActivate {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; partner?: Partner }>();
    const key = /^Bearer (\S+)$/.exec(request.headers.authorization ?? '')?.[1];
    if (!key) {
      throw new UnauthorizedException();
    }
    const hash = createHash('sha256').update(key).digest('hex');
    const [partner] = await this.db
      .select({ id: partners.id, name: partners.name })
      .from(partners)
      .where(eq(partners.apiKeyHash, hash));
    if (!partner) {
      throw new UnauthorizedException();
    }
    request.partner = partner;
    return true;
  }
}

/** The partner `PartnerGuard` authenticated. */
export const CurrentPartner = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<{ partner: Partner }>().partner,
);
