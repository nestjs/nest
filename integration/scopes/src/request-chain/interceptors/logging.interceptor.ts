import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { HelperService } from '../helper/helper.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly helperSvc: HelperService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    this.helperSvc.noop();
    if (!this.helperSvc.request) {
      throw new Error('error');
    }
    return next.handle();
  }
}
