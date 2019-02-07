import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { SocialMediaLoginController } from './sml.controller';

@Module({
  imports: [
    PassportModule.register({defaultStrategy: 'jwt', session: true}),
    JwtModule.register({
      secretOrPrivateKey: 'secretKey',
      signOptions: {
        expiresIn: 3600,
      },
    }),
  ],
  controllers: [AuthController, SocialMediaLoginController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
})
export class AuthModule {}
