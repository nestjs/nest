import { User } from "../../models/user";
import { Component } from "./../../../nest/core/utils";

@Component()
export class UsersQueryService {

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