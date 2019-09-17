import { Controller, Get, Header, Param } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { HostService } from './host.service';
import { UserByIdPipe } from './users/user-by-id.pipe';

@Controller({
  path: 'host',
  host: 'host.example.com',
})
export class HostController {
  constructor(private readonly hostService: HostService) {}

  @Get()
  @Header('Authorization', 'Bearer')
  greeting(): string {
    return this.hostService.greeting();
  }

  @Get('async')
  async asyncGreeting(): Promise<string> {
    return await this.hostService.greeting();
  }

  @Get('stream')
  streamGreeting(): Observable<string> {
    return of(this.hostService.greeting());
  }

  @Get('local-pipe/:id')
  localPipe(
    @Param('id', UserByIdPipe)
    user: any,
  ): any {
    return user;
  }
}
