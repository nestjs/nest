import { Guard, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { Reflector } from '@nestjs/core';

@Guard()
export class BreedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(request, context: ExecutionContext): boolean {
    return true;
  }
}