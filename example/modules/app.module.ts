import { UsersModule } from "./users/users.module";
import { Module } from "./../../src/";

@Module({
    modules: [ UsersModule ]
})
export class ApplicationModule {}