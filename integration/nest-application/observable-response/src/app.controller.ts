import { Controller, Get } from '@nestjs/common';
import { interval, map, of } from 'rxjs';

let ticks = 0;

export function resetTicks() {
  ticks = 0;
}

export function readTicks() {
  return ticks;
}

@Controller()
export class AppController {
  @Get('observable')
  stream() {
    return interval(20).pipe(
      map(() => {
        ticks++;
        return { tick: ticks };
      }),
    );
  }

  @Get('ticks')
  countTicks() {
    return { ticks };
  }

  @Get('final')
  final() {
    return of({ ok: true });
  }
}
