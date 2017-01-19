import { Module } from "./../../nest/core/utils";
import { SharedService } from "./shared.service";

@Module({
    components: [
        SharedService,
    ],
    exports: [
        SharedService,
    ]
})
export class SharedModule {
    configure() {
        console.log("shared configured");
    }
}