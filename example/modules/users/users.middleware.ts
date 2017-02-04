import * as jwt from "jsonwebtoken";
import { UsersQueryService } from "./users-query.service";
import { Component, Middleware } from "./../../../src/";

@Component()
export class JWTMiddleware implements Middleware {

    constructor(private usersQueryService: UsersQueryService) {}

    resolve() {
        return (req, res, next) => {
            console.log("JWTmiddleware");
            next();
            /*var token = req.body.token || req.query.token || req.headers['x-access-token'];

            if (token) {

                // verifies secret and checks exp
                jwt.verify(token, "XD", function(err, decoded) {
                    if (err) {
                        return res.json({ success: false, message: 'Failed to authenticate token.' });
                    } else {
                        // if everything is good, save to request for use in other routes
                        req.decoded = decoded;
                        next();
                    }
                });

            } else {

                // if there is no token
                // return an error
                return res.status(403).send({
                    success: false,
                    message: 'No token provided.'
                });

            }*/
        }
    }

}

