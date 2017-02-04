import { AuthRoute } from "./login.route";
import { SharedModule } from "../shared.module";
import { Module } from "./../../../src/";

@Module({
    modules: [
        SharedModule,
    ],
    controllers: [
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