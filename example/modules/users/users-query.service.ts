//import { User } from "../../models/user";
import { SharedService } from "../shared.service";
import { Component, RequestMapping } from "./../../../src/";
import { UsersGateway } from "./users.gateway";

import { Subject } from "rxjs";

@Component()
export class UsersQueryService {

    public stream$ = new Subject<string>();
    static get dependencies() {
        return [ UsersGateway, SharedService ];
    }

    constructor(private usersGateway: UsersGateway, private shared: SharedService) {
        this.shared.stream$.subscribe((xd) => {
            console.log("ONCE");
            this.stream$.next(xd);
        });
    }
    /*
    getAllUsers(): Promise<any> {
        return new Promise((resolve) => {
            User.find((err, res) => {
                if(err) {
                    throw new Error(err);
                }

                resolve(res);
            });
        });
    }*/
}