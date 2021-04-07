import { Controller, Get, Header, HostParam, Param } from '@nestjs/common';
import { Observable, of } from 'rxjs';

import { UserByIdPipe } from './users/user-by-id.pipe';
import { HostService } from './host.service';

@Controller({
  path: 'host',
  host: ':tenant.example.com',
})
export class HostController {
  constructor(private readonly hostService: HostService) {}

  @Get()
  @Header('Authorization', 'Bearer')
  greeting(@HostParam('tenant') tenant: string): string {
    return `${this.hostService.greeting()} tenant=${tenant}`;
  }

  @Get('async')
  async asyncGreeting(@HostParam('tenant') tenant: string): Promise<string> {
    return `${await this.hostService.greeting()} tenant=${tenant}`;
  }

  @Get('stream')
  streamGreeting(@HostParam('tenant') tenant: string): Observable<string> {
    return of(`${this.hostService.greeting()} tenant=${tenant}`);
  }

  @Get('local-pipe/:id')
  localPipe(
    @Param('id', UserByIdPipe)
    user: any,
    @HostParam('tenant') tenant: string,
  ): any {
    return { ...user, tenant };
  }
}
