import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Guard that verifies the authenticity of a request using an HMAC signature.
 *
 * @publicApi
 */
@Injectable()
export class HmacGuard implements CanActivate {
  private readonly secret: string;
  private readonly hmacHeader: string;

  constructor(options?: { secret?: string; hmacHeader?: string }) {
    this.secret = options?.secret || '';
    this.hmacHeader = options?.hmacHeader || 'x-signature';
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.secret) {
      throw new Error('HMAC secret is not configured');
    }

    const request = context.switchToHttp().getRequest();
    const signature = request.headers[this.hmacHeader.toLowerCase()];

    if (!signature) {
      throw new UnauthorizedException('Missing HMAC signature');
    }

    const payload = request.rawBody
      ? request.rawBody
      : JSON.stringify(request.body);
    const expectedSignature = createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');

    const signatureBuffer = Buffer.from(String(signature), 'utf8');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    const isSignatureValid = timingSafeEqual(
      signatureBuffer,
      expectedSignatureBuffer,
    );

    if (!isSignatureValid) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    return true;
  }
}
