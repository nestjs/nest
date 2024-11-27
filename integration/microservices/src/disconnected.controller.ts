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
    return client.send<number, number[]>({ cmd: 'none' }, [1, 2, 3]).pipe(
      // tap(
      //   console.log.bind(console, 'data'),
      //   console.error.bind(console, 'error'),
      // ),
      catchError(error => {
        const { code } = error?.err ?? error ?? { code: 'CONN_ERR' };
        return throwError(() =>
          code === 'ECONNREFUSED' ||
          code === 'CONN_ERR' ||
          code === 'ENOTFOUND' ||
          code === 'CONNECTION_REFUSED' ||
          error.message.includes('Connection is closed.')
            ? new RequestTimeoutException('ECONNREFUSED')
            : new InternalServerErrorException(),
        );
      }),
      tap({
        error: () => client.close(),
      }),
    );
  }
}
