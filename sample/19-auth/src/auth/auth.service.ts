import * as jwt from 'jsonwebtoken';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async createToken() {
    const expiresIn = 3600,
      secretOrKey = 'secretKey';
    const user = { email: 'test@email.com' };
    return {
      expiresIn: expiresIn,
      accessToken: jwt.sign(user, secretOrKey, { expiresIn }),
    };
  }

  async validateUser(signedUser): Promise<boolean> {
    // put some validation logic here
    // for example query user by id / email / username
    return true;
  }
}
