import { UsersRoute } from "./users.route";
import { UsersQueryService } from "./users-query.service";
import { Module } from "./../../../src/";

@Module({
    controllers: [ UsersRoute ],
    components: [ UsersQueryService ]
})
export class UsersModule {}