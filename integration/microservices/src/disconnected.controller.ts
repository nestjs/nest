import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  RequestTimeoutException,
} from '@nestjs/common';
import { ClientProxyFactory } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Controller()
export class DisconnectedClientController {
  @Post()
  call(@Body() options): Observable<number> {
    const client = ClientProxyFactory.create(options);
    return client
      .send<number, number[]>({ cmd: 'none' }, [1, 2, 3])
      .pipe(
        tap(
          console.log.bind(console, 'data'),
          console.error.bind(console, 'error'),
        ),
        catchError(({ code }) =>
          throwError(
            code === 'ECONNREFUSED' || code === 'CONN_ERR'
              ? new RequestTimeoutException('ECONNREFUSED')
              : new InternalServerErrorException(),
          ),
        ),
      );
  }
}
