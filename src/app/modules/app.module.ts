import { Module } from "./../../nest/core/utils";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";

@Module({
    modules: [
        UsersModule,
        AuthModule
    ],
})
export class ApplicationModule {
    configure() {
        console.log("app configured");
    }
}