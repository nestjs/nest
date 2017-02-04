
import { SharedService } from "./shared.service";
import { Module } from "./../../src/";

@Module({
    components: [
        SharedService,
    ],
    exports: [
        SharedService,
    ]
})
export class SharedModule {
    configure() {}
}