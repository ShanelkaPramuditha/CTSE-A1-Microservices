// ============================================
// Order Service - Module
// ============================================
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppConfigModule, AppConfigService } from '@app/common';
import { PRODUCT_SERVICE, PAYMENT_SERVICE } from '@app/common/constants';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Cart, CartSchema, Order, OrderSchema } from './schemas/schemas';

@Module({
  imports: [
    AppConfigModule,

    // Cart database connection (named 'cart')
    MongooseModule.forRootAsync({
      connectionName: 'cart',
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.order.mongoUri,
      }),
    }),

    // Order database connection (named 'order')
    MongooseModule.forRootAsync({
      connectionName: 'order',
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.order.mongoUri,
      }),
    }),

    // Register schemas on their respective connections
    MongooseModule.forFeature(
      [{ name: Cart.name, schema: CartSchema }],
      'cart',
    ),
    MongooseModule.forFeature(
      [{ name: Order.name, schema: OrderSchema }],
      'order',
    ),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,

    // TCP Client → Product Service (for stock validation during checkout/order)
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

    // TCP Client → Payment Service (for payment processing)
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
  ],
})
export class OrderModule {}
