import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { AuthService } from './auth.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: 'clientId',
      clientSecret: 'clientSecret',
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['profile'],
      failureRedirect: '/auth/google/signin',
      session: true,
    }, (accessToken, refreshToken, profile, cb) => {
      return cb(null, {googleId: profile.id});
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
