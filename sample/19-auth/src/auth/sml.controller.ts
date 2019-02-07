import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class SocialMediaLoginController {
  constructor(private readonly authService: AuthService) {
  }

  @Get('google/signin')
  @UseGuards(AuthGuard('google'))
  google() {
    return 'google protected endpoint';
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googlecallback() {
    return await this.authService.createToken();
  }
}
