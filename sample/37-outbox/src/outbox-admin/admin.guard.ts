import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

type HttpRequest = { headers: Record<string, string | string[] | undefined> };

/** Placeholder: protect these routes with your application's real authorization. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const token = process.env.ADMIN_TOKEN;
    const given = request.headers['x-admin-token'];
    return !!token && typeof given === 'string' && sameSecret(given, token);
  }
}

/** Compares in constant time, so response times don't give the token away. */
function sameSecret(given: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}
