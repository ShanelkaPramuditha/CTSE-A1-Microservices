// ============================================
// API Gateway - Entry Point
// ============================================
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/rpc-exception.filter';
import { AppConfigService } from '@app/common';

async function bootstrap() {
  const logger = new Logger('APIGateway');
  const app = await NestFactory.create(AppModule);

  const config = app.get(AppConfigService);
  const port = config.apiGateway.port;

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter for microservice errors
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable Cookie Parser
  app.use(cookieParser());

  // Enable CORS
  app.enableCors({ origin: true, credentials: true });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger setup (only in API Gateway)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-Commerce Microservices API')
    .setDescription(
      'API Gateway for the E-Commerce microservices backend. ' +
        'Routes requests to User, Product, Order, and Payment services via TCP.',
    )
    .setVersion('1.0')
    .addCookieAuth('Authentication', {
      type: 'apiKey',
      in: 'cookie',
      name: 'Authentication',
      description: 'JWT stored in HttpOnly cookie',
    })
    .addTag('Auth', 'User authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Products', 'Product catalog endpoints')
    .addTag('Cart', 'Shopping cart endpoints')
    .addTag('Orders', 'Order management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 API Gateway is running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
