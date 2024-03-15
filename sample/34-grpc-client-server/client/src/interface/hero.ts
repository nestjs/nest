/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';

export const protobufPackage = 'hero';

export interface HeroById {
  id: number;
}

export interface Hero {
  id: number;
  name: string;
}

export const HERO_PACKAGE_NAME = 'hero';

export interface HeroesServiceClient {
  findOne(request: HeroById): Observable<Hero>;

  findMany(request: Observable<HeroById>): Observable<Hero>;
}

export interface HeroesServiceController {
  findOne(request: HeroById): Promise<Hero> | Observable<Hero> | Hero;

  findMany(request: Observable<HeroById>): Observable<Hero>;
}

export function HeroesServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ['findOne'];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(
        constructor.prototype,
        method,
      );
      GrpcMethod('HeroesService', method)(
        constructor.prototype[method],
        method,
        descriptor,
      );
    }
    const grpcStreamMethods: string[] = ['findMany'];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(
        constructor.prototype,
        method,
      );
      GrpcStreamMethod('HeroesService', method)(
        constructor.prototype[method],
        method,
        descriptor,
      );
    }
  };
}

export const HEROES_SERVICE_NAME = 'HeroesService';
