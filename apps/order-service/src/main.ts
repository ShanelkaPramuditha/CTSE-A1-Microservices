// ============================================
// Order Service - Entry Point
// ============================================
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderModule } from './order.module';

async function bootstrap() {
  const logger = new Logger('OrderService');

  const appContext = await NestFactory.createApplicationContext(OrderModule);
  const configService = appContext.get(ConfigService);

  const host = configService.get<string>('ORDER_SERVICE_HOST', 'localhost');
  const port = configService.get<number>('ORDER_SERVICE_PORT', 4003);

  await appContext.close();

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
  logger.log(`🚀 Order Service is listening on ${host}:${port} (TCP)`);
}

bootstrap();
