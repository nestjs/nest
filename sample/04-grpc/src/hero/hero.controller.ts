import { Controller, Get } from '@nestjs/common';
import {
  ClientProxy,
  Client,
  Transport,
  MessagePattern,
  GrpcRoute,
  ClientGrpc,
} from '@nestjs/microservices';
import { Observable } from 'rxjs/Observable';
import { join } from 'path';

interface HeroService {
  FindOne(data: { id: number }): Observable<any>;
}

@Controller()
export class HeroController {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'hero',
      protoPath: join(__dirname, './hero.proto'),
    },
  })
  client: ClientGrpc;

  @Get()
  call(): Observable<any> {
    const heroService = this.client.getService<HeroService>('HeroService');
    return heroService.FindOne({ id: 1 });
  }

  @GrpcRoute('HeroService', 'FindOne')
  findOne(data: { id: number }): any {
    const items = [{ id: 1, name: 'John' }, { id: 2, name: 'Doe' }];
    return items.find(({ id }) => id === data.id);
  }
}
