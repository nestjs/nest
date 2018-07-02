import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Jwt } from './jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JsonWebToken } from './interfaces/jwt.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Get('token')
  async createToken(payload: JwtPayload): Promise<JsonWebToken> {
    return Jwt.createToken(payload);
  }

  @Get('data')
  @UseGuards(AuthGuard('bearer'))
  findAll() {
    // this route is restricted
  }
}
