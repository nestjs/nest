import { User } from "../../models/user";
import { Component } from "./../../../nest/core/utils";
import { SharedService } from "../shared.service";

@Component()
export class UsersQueryService {

    constructor(private shared: SharedService) {

    }
    getAllUsers(): Promise<any> {
        return new Promise((resolve) => {
            User.find((err, res) => {
                if(err) {
                    throw new Error(err);
                }

                resolve(res);
            });
        });
    }
}