import { Controller, Get, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc, GrpcMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { HeroById } from './interfaces/hero-by-id.interface';
import { Hero } from './interfaces/hero.interface';

interface HeroService {
  findOne(data: HeroById): Observable<any>;
}

@Controller()
export class HeroController implements OnModuleInit {
  private heroService: HeroService;

  constructor(@Inject('HERO_PACKAGE') private readonly client: ClientGrpc) {}

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
