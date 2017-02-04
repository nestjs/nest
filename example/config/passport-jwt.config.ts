import * as _ from "lodash";
import { Application } from "express";
import * as passport from "passport";
import { ExtractJwt, Strategy, StrategyOptions } from "passport-jwt";

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

export class PassportJWTConfig {
    static readonly secretKey = "XD";

    static readonly jwtOptions: StrategyOptions = {
        jwtFromRequest: ExtractJwt.fromAuthHeader(),
        secretOrKey: PassportJWTConfig.secretKey,
    };

    static setupConfig(app: Application) {
        this.init();
        app.use(passport.initialize());
    }

    static init() {

        var strategy = new Strategy(this.jwtOptions, (payload, next) => {
            console.log('payload received', payload);

            var user = users[_.findIndex(users, {id: payload.id})];
            console.log(user);
            next(null, user || false);
        });

        passport.use(strategy);
    }

}