import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for development
  app.enableCors();
  
  await app.listen(3000);
  console.log('🚀 Circuit Breaker Sample Application is running on http://localhost:3000');
  console.log('📊 Health checks available at http://localhost:3000/health');
  console.log('📈 Metrics available at http://localhost:3000/metrics/circuit-breakers');
}

bootstrap();