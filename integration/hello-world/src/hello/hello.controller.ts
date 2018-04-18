import { HelloService } from './hello.service';
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';

@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  greeting(): string {
    return this.helloService.greeting();
  }

  @Get('async')
  async asyncGreeting(): Promise<string> {
    return await this.helloService.greeting();
  }

  @Get('stream')
  streamGreeting(): Observable<string> {
    return of(this.helloService.greeting());
  }
}
