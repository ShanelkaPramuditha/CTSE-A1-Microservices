// ============================================
// API Gateway - Root Module
// ============================================
import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import {
  AppConfigModule,
  AppConfigService,
  USER_SERVICE,
  PRODUCT_SERVICE,
  ORDER_SERVICE,
  PAYMENT_SERVICE,
  CART_SERVICE,
} from '@app/common';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { CartController } from './controllers/cart.controller';
import { OrderController } from './controllers/order.controller';
import { ProductController } from './controllers/product.controller';
import { JwtStrategy } from './guards/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    // Centralized configuration and validation
    AppConfigModule,
    // Passport for JWT strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // JWT module for token validation
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwt.secret,
        signOptions: {
          expiresIn: config.jwt.expiration as any,
        },
      }),
    }),
  ],
  controllers: [AuthController, UserController, ProductController, CartController, OrderController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    // TCP Client → User Service
    {
      provide: USER_SERVICE,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: config.user.host,
            port: config.user.port,
          },
        }),
    },
    // TCP Client → Product Service
    {
      provide: PRODUCT_SERVICE,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: config.product.host,
            port: config.product.port,
          },
        }),
    },
    // TCP Client → Order Service
    // NOTE: Cart and Order are both handled by order-service
    {
      provide: ORDER_SERVICE,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: config.order.host,
            port: config.order.port,
          },
        }),
    },
    // TCP Client → Payment Service
    {
      provide: PAYMENT_SERVICE,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: config.payment.host,
            port: config.payment.port,
          },
        }),
    },
    // TCP Client → Cart Service
    {
      provide: CART_SERVICE,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: config.order.host,
            port: config.order.port,
          },
        }),
    },
  ],
})
export class AppModule {}
