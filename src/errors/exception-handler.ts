import * as clc from "cli-color";
import { RuntimeException } from "./exceptions/runtime.exception";

export class ExceptionHandler {
    handle(e: RuntimeException | Error) {
        var error = clc.red.bold;
        var warn = clc.xterm(214);

        if (e instanceof RuntimeException) {
            console.log(error("[Nest] Runtime error!"));
            console.log(warn(e.what()));
        }
        console.log(error("Stack trace:"));
        console.log(e.stack);
    }
}