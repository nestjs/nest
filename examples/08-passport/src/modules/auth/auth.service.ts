import * as jwt from 'jsonwebtoken';
import { Component, Inject } from '@nestjs/common';

@Component()
export class AuthService {
  public async createToken() {
    const expiresIn = 60 * 60;
    const secretOrKey = 'secret';
    const user = {
      id: 1,
      email: 'test@test.com',
    };
    const token = jwt.sign(user, secretOrKey, { expiresIn });
    return {
      expires_in: expiresIn,
      access_token: token,
    };
  }

  public async validateUser(signedUser): Promise<boolean> {
    // put some validation logic here
    // for example query user by id / email / username
    return true;
  }
}
