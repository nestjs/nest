import { Request, Response, NextFunction } from "express";
import { Route } from "./../../../nest/core/utils";
import { Path } from "../../../nest/core/utils/path.decorator";
import { UsersQueryService } from "./users-query.service";
import { RequestMethod } from "../../../nest/core/enums/request-method.enum";

@Route({ path: "users" })
export class UsersRoute {

    constructor(private usersQueryService: UsersQueryService) {}

    @Path({
        path: "/",
        requestMethod: RequestMethod.GET
    })
    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const users = await this.usersQueryService.getAllUsers();
            res.status(201).json(users);
        }
        catch(e) {
            next(e.message);
        }
    }

}

