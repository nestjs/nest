import { CanActivate, Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class CatsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
