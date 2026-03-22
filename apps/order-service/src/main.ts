// ============================================
// Order Service - Entry Point
// ============================================
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AppConfigService } from '@app/common';
import { OrderModule } from './order.module';

async function bootstrap() {
  const logger = new Logger('OrderService');

  // Temporary context to read config, then close it
  const appContext = await NestFactory.createApplicationContext(OrderModule);
  const config = appContext.get(AppConfigService);

  const host = config.order.host;
  const port = config.order.port;

  await appContext.close();

  // Create TCP microservice
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrderModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port,
      },
    },
  );

  await app.listen();
  logger.log(`🛒 Order Service listening on ${host}:${port} (TCP)`);
  logger.log(`   Handles: cart (add/update/remove/clear) + checkout + orders`);
}

bootstrap();
