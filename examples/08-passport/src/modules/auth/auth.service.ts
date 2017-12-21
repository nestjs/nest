import * as jwt from 'jsonwebtoken';
import { Component, Inject } from '@nestjs/common';

@Component()
export class AuthService {
  async createToken() {
    const expiresIn = 60 * 60,
      secretOrKey = 'secret';
    const user = { email: 'thisis@example.com' };
    const token = jwt.sign(user, secretOrKey, { expiresIn });
    return {
      expires_in: expiresIn,
      access_token: token
    };
  }

  async validateUser(signedUser): Promise<boolean> {
    // put some validation logic here
    // for example query user by id / email / username
    return true;
  }
}
