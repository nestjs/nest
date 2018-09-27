import { RoutesMapper } from './routes-mapper.service';

export class MiddlewareBuilder {
  constructor(private readonly routesMapper: RoutesMapper) {}

  public build() {}
}
