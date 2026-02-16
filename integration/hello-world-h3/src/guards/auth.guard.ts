import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly allowRequest: boolean;

  constructor(allowRequest: boolean = true) {
    this.allowRequest = allowRequest;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Check for auth header
    const authHeader = request.headers?.authorization;
    if (this.allowRequest) {
      return true;
    }
    return !!authHeader;
  }
}
