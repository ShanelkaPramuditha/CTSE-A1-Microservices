// ============================================
// User Service - Entry Point
// ============================================
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AppConfigService } from '@app/common';
import { UserModule } from './user.module';

async function bootstrap() {
  const logger = new Logger('UserService');

  // Create a temporary app context to access ConfigService
  const appContext = await NestFactory.createApplicationContext(UserModule);
  const config = appContext.get(AppConfigService);

  const host = config.user.host;
  const port = config.user.port;

  await appContext.close();

  // Create the TCP microservice
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port,
      },
    },
  );

  await app.listen();
  logger.log(`🚀 User Service is listening on ${host}:${port} (TCP)`);
}

bootstrap();
