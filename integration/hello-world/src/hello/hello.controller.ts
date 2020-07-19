import { Controller, Get, Header, Param, Render, WithAlias } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { HelloService } from './hello.service';
import { UserByIdPipe } from './users/user-by-id.pipe';

@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  @Header('Authorization', 'Bearer')
  greeting(): string {
    return this.helloService.greeting();
  }

  @Get('async')
  async asyncGreeting(): Promise<string> {
    return this.helloService.greeting();
  }

  @Get('stream')
  streamGreeting(): Observable<string> {
    return of(this.helloService.greeting());
  }

  @Get('local-pipe/:id')
  localPipe(
    @Param('id', UserByIdPipe)
    user: any,
  ): any {
    return user;
  }

  @Get('mvc')
  @Render('mvc')
  mvc() {
    return { message: 'Hello World!' }
  }

  @Get('mvc-alias')
  @WithAlias('mvc')
  @Render('mvc')
  mvcAliased() {
    return { message: 'Hello World!' }
  }

  @Get('mvc/:id')
  @WithAlias('mvc-id')
  @Render('mvc-id')
  mvcAliasedWithId(@Param('id') id) {
    return { message: 'Hello World!', id }
  }
}
