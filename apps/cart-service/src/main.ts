// ============================================
// Cart Service - Entry Point
// ============================================
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AppConfigService } from '@app/common';
import { CartModule } from './cart.module';

async function bootstrap() {
  const logger = new Logger('CartService');

  // Create a temporary app context to access ConfigService
  const appContext = await NestFactory.createApplicationContext(CartModule);
  const config = appContext.get(AppConfigService);

  const host = config.cart.host;
  const port = config.cart.port;

  await appContext.close();

  // Create the TCP microservice
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CartModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port,
      },
    },
  );

  await app.listen();
  logger.log(`🚀 Cart Service is listening on ${host}:${port} (TCP)`);
}

bootstrap();
