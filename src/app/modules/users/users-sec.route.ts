import { Request, Response, NextFunction } from "express";
import { Route } from "./../../../nest/core/utils";
import { RequestMapping } from "../../../nest/core/utils/path.decorator";
import { UsersQueryService } from "./users-query.service";
import { RequestMethod } from "../../../nest/core/enums/request-method.enum";

@Route({ path: "users" })
export class UsersSecRoute {

    constructor(private usersQueryService: UsersQueryService) {}

    @RequestMapping({
        path: "/",
        method: RequestMethod.GET
    })
    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        console.log("sxd");
        try {
            const users = await this.usersQueryService.getAllUsers();
            res.status(201).json(users);
            next();
        }
        catch(e) {
            next(e.message);
        }
    }

}

