import { Module } from "./../../../nest/core/utils";
import { UsersRoute } from "./users.route";
import { UsersQueryService } from "./users-query.service";
import { UsersGateway } from "./users.gateway";

@Module({
    routes: [
        UsersRoute
    ],
    components: [
        UsersQueryService,
        UsersGateway,
    ]
})
export class UsersModule {}