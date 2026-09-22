import { CanActivate, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class DenyGuard implements CanActivate {
  canActivate(): boolean {
    throw new UnauthorizedException();
  }
}
