// ============================================
// Product Service - Entry Point
// ============================================
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductModule } from './product.module';

async function bootstrap() {
  const logger = new Logger('ProductService');

  const appContext = await NestFactory.createApplicationContext(ProductModule);
  const configService = appContext.get(ConfigService);

  const host = configService.get<string>('PRODUCT_SERVICE_HOST', 'localhost');
  const port = configService.get<number>('PRODUCT_SERVICE_PORT', 4002);

  await appContext.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ProductModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port,
      },
    },
  );

  await app.listen();
  logger.log(`🚀 Product Service is listening on ${host}:${port}`);
}

bootstrap();
