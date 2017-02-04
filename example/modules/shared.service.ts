import { Component } from "./../../src/";
import { Subject } from "rxjs";

@Component()
export class SharedService {
    public stream$ = new Subject<string>();
    constructor() {
        setTimeout(() => {
            this.stream$.next("XDDD");
        }, 3000);
    }
}