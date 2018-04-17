import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { catchError } from 'rxjs/operators';
import { _throw } from 'rxjs/observable/throw';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    call$: Observable<any>,
  ): Observable<any> {
    return call$.pipe(
      catchError(err =>
        _throw(new HttpException('Message', HttpStatus.BAD_GATEWAY)),
      ),
    );
  }
}
