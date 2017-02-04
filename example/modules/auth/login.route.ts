import * as _ from "lodash";
import * as jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { PassportJWTConfig } from "../../config/passport-jwt.config";
import { Controller, RequestMethod, RequestMapping } from "./../../../src/";

var users = [
    {
        id: 1,
        name: 'jonathanmh',
        password: '%2yx4'
    },
    {
        id: 2,
        name: 'test',
        password: 'test'
    }
];

@Controller({ path: "login" })
export class AuthRoute {

    constructor() {}

    @RequestMapping({ path: "/", method: RequestMethod.POST })
    fetchToken(req: Request, res: Response, next: NextFunction) {
        const { name, password } = req.body;

        const user = users[_.findIndex(users, {name: name})];
        if (!user){
            res.status(401).json({message:"no such user found"});
        }

        if(user.password === password) {
            const payload = {id: user.id};
            const token = jwt.sign(payload, PassportJWTConfig.secretKey);
            res.json({message: "ok", token: token});
        }
        else {
            res.status(401).json({message:"passwords did not match"});
        }
    }

}

