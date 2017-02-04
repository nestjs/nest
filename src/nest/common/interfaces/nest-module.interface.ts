import { MiddlewaresBuilder } from "../middlewares/builder";

export interface NestModule {
    configure?: (router: MiddlewaresBuilder) => MiddlewaresBuilder;
}
