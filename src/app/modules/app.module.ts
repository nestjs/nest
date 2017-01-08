import { Module } from "./../../nest/core/utils";
import { UsersModule } from "./users/users.module";

@Module({
    modules: [
        UsersModule
    ],
})
export class ApplicationModule {}