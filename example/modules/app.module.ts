import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { Module } from "./../../src/";

@Module({
    modules: [
        UsersModule,
        AuthModule
    ]
})
export class ApplicationModule {
    configure() {}
}