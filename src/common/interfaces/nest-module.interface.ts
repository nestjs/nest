import { MiddlewareBuilder } from '../../core/middlewares/builder';

export interface NestModule {
    configure?: (router: MiddlewareBuilder) => MiddlewareBuilder;
}
