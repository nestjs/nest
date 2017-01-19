import { Module } from "./../../../nest/core/utils";
import { UsersRoute } from "./users.route";
import { UsersQueryService } from "./users-query.service";
import { UsersGateway } from "./users.gateway";
import { UsersSecRoute } from "./users-sec.route";
import { JWTMiddleware } from "./users.middleware";
import { SharedModule } from "../shared.module";
import { SharedService } from "../shared.service";

@Module({
    modules: [
        SharedModule,
    ],
    routes: [
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
        return router
            .use({
                middlewares: [ JWTMiddleware ],
                forRoutes: [
                    //UsersRoute,
                    { path: "/users" }
                ]
            });
    }

}