import { Request, Response, NextFunction } from "express";
import { UsersQueryService } from "./users-query.service";
import { RequestMethod, Controller, RequestMapping } from "./../../../src/";

@Controller({ path: "users" })
export class UsersRoute {

    constructor(private usersQueryService: UsersQueryService) {}

    @RequestMapping({
        path: "/",
        method: RequestMethod.GET
    })
    getAllUsers(req: Request, res: Response, next: NextFunction) {}
}

