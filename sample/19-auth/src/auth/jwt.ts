import * as jwt from 'jsonwebtoken';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JsonWebToken } from './interfaces/jwt.interface';

export class Jwt {
    static createToken(payload: JwtPayload): JsonWebToken {
        const _payload: JwtPayload = {
            email: payload.email,
        };
        const _expiration = 3600;
        const _options: jwt.SignOptions = {
            expiresIn: _expiration,
        };
        const _token: string = jwt.sign(_payload, 'secretKey', _options);
        return {
            expiration: _expiration,
            token: _token,
        };
    }
}