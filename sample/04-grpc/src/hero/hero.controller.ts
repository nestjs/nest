import { Controller, Get, OnModuleInit } from '@nestjs/common';
import { Client, ClientGrpc, GrpcMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { grpcClientOptions } from '../grpc-client.options';
import { HeroById } from './interfaces/hero-by-id.interface';
import { Hero } from './interfaces/hero.interface';

interface HeroService {
  findOne(data: { id: number }): Observable<any>;
}

@Controller()
export class HeroController implements OnModuleInit {
  @Client(grpcClientOptions)
  private readonly client: ClientGrpc;

  private heroService: HeroService;

  onModuleInit() {
    this.heroService = this.client.getService<HeroService>('HeroService');
  }

  @Get()
  execute(): Observable<any> {
    return this.heroService.findOne({ id: 1 });
  }

  @GrpcMethod('HeroService')
  findOne(data: HeroById): Hero {
    const items: Hero[] = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Doe' },
    ];
    return items.find(({ id }) => id === data.id);
  }
}
