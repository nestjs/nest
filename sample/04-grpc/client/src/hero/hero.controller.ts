import { Controller, Get, Inject, OnModuleInit, Param } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, ReplaySubject } from 'rxjs';
import { toArray } from 'rxjs/operators';
import {
  Hero,
  HeroById,
  HEROES_SERVICE_NAME,
  HeroesServiceClient,
} from '../interface/hero';

@Controller('hero')
export class HeroController implements OnModuleInit {
  private heroesServiceClient: HeroesServiceClient;

  constructor(@Inject('HERO_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.heroesServiceClient =
      this.client.getService<HeroesServiceClient>(HEROES_SERVICE_NAME);
  }

  @Get()
  getMany(): Observable<Hero[]> {
    const ids$ = new ReplaySubject<HeroById>();
    ids$.next({ id: 1 });
    ids$.next({ id: 2 });
    ids$.complete();

    const stream$ = this.heroesServiceClient.findMany(ids$.asObservable());
    return stream$.pipe(toArray());
  }

  @Get(':id')
  getById(@Param('id') id: string): Observable<Hero> {
    return this.heroesServiceClient.findOne({ id: +id });
  }
}
