import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ExternalApiService } from '../services/external-api.service';
import { DatabaseService } from '../services/database.service';

@Controller('api')
export class ApiController {
  constructor(
    private readonly externalApiService: ExternalApiService,
    private readonly databaseService: DatabaseService,
  ) {}

  // External API endpoints
  @Get('external-success')
  async callExternalApi() {
    return this.externalApiService.callExternalApi();
  }

  @Get('external-fail')
  async callFailingApi() {
    try {
      return await this.externalApiService.callFailingApi();
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('external-slow')
  async callSlowApi() {
    try {
      return await this.externalApiService.callSlowApi();
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Database endpoints
  @Get('users')
  async getUsers() {
    return this.databaseService.findAllUsers();
  }

  @Post('users')
  async createUser(@Body() userData: any) {
    return this.databaseService.createUser(userData);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.databaseService.deleteUser(parseInt(id, 10));
  }

  // Testing endpoints
  @Post('users/simulate-db-error')
  async toggleDatabaseError(@Query('enable') enable?: string) {
    this.databaseService.toggleFailureSimulation();
    return {
      message: 'Database failure simulation toggled',
      enabled: this.databaseService.getFailureSimulationStatus(),
      timestamp: new Date().toISOString(),
    };
  }
}