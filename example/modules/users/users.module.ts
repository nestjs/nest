
import { UsersRoute } from "./users.route";
import { UsersQueryService } from "./users-query.service";
import { UsersGateway } from "./users.gateway";
import { UsersSecRoute } from "./users-sec.route";
import { JWTMiddleware } from "./users.middleware";
import { SharedModule } from "../shared.module";
import { SharedService } from "../shared.service";
import { Module } from "./../../../src/";

    @Module({
        modules: [
            SharedModule,
        ],
        controllers: [
            UsersRoute,
            UsersSecRoute
        ],
        components: [
            UsersQueryService,
            UsersGateway,
        ]
    })
    export class UsersModule {

        configure(router) {
            router.use({
                middlewares: [ JWTMiddleware ],
                forRoutes: [ UsersRoute, UsersSecRoute ]
            });
        }

}