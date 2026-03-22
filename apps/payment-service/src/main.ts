// ============================================
// Payment Service - Entry Point
// ============================================
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentModule } from './payment.module';

async function bootstrap() {
  const logger = new Logger('PaymentService');

  const appContext = await NestFactory.createApplicationContext(PaymentModule);
  const configService = appContext.get(ConfigService);

  const host = configService.get<string>('PAYMENT_SERVICE_HOST', 'localhost');
  const port = configService.get<number>('PAYMENT_SERVICE_PORT', 4004);

  await appContext.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port,
      },
    },
  );

  await app.listen();
  logger.log(`🚀 Payment Service is listening on ${host}:${port} (TCP)`);
}

bootstrap();
