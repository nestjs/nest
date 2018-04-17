import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '../passport/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('token')
  async createToken(): Promise<any> {
    return await this.authService.createToken();
  }

  @Get('data')
  @UseGuards(AuthGuard('jwt'))
  getSensitiveData() {
    // this route is restricted
  }
}
