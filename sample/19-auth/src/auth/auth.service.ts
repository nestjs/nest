import * as jwt from 'jsonwebtoken';
import { Injectable } from '@nestjs/common';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  async createToken() {
    const expiresIn = 3600;
    const user: JwtPayload = { email: 'test@email.com' };
    return {
      expiresIn: expiresIn,
      accessToken: jwt.sign(user, 'secretKey', { expiresIn }),
    };
  }

  async validateUser(payload: JwtPayload): Promise<any> {
    // put some validation logic here
    // for example query user by id/email/username
    return {};
  }
}
