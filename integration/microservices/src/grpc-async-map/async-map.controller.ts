import {
  CallHandler,
  Controller,
  Injectable,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Item {
  n: number;
  label: string;
  reject?: boolean;
}

@Injectable()
export class AsyncMapInterceptor implements NestInterceptor {
  intercept(_context: unknown, next: CallHandler) {
    return next.handle().pipe(
      map(async (item: Item) => {
        if (item.reject) {
          throw new Error('async map rejected');
        }
        return { n: item.n, label: `${item.label}!` };
      }),
    );
  }
}

@Controller()
@UseInterceptors(AsyncMapInterceptor)
export class AsyncMapController {
  @GrpcMethod('AsyncMap')
  unary(item: Item): Item {
    return { n: item.n, label: 'unary' };
  }

  @GrpcMethod('AsyncMap')
  serverStream(count: { n: number; label: string; reject: boolean }) {
    return new Observable<Item>(subscriber => {
      for (let n = 1; n <= count.n; n++) {
        subscriber.next({ n, label: count.label, reject: count.reject });
      }
      subscriber.complete();
    });
  }

  @GrpcStreamMethod('AsyncMap')
  echo(items: Observable<Item>) {
    return items.pipe(map(item => ({ n: item.n, label: 'echo' })));
  }
}
