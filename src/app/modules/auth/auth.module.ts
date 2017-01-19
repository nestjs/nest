import { Module } from "./../../../nest/core/utils";
import { AuthRoute } from "./login.route";
import { SharedModule } from "../shared.module";

@Module({
    modules: [
        SharedModule,
    ],
    routes: [
        AuthRoute
    ],
    components: [
    ]
})
export class AuthModule {
    configure() {
        console.log("auth configured");
    }
}