import { CanActivate, Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class CatsGuard implements CanActivate {
  canActivate(request: any, context: ExecutionContext): boolean {
    return true;
  }
}
