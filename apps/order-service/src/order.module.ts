// ============================================
// Order Service - Module
// ============================================
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { PRODUCT_SERVICE, PAYMENT_SERVICE } from '@app/common/constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI_ORDER'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    // TCP Client → Product Service
    {
      provide: PRODUCT_SERVICE,
      useFactory: (configService: ConfigService) =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('PRODUCT_SERVICE_HOST'),
            port: configService.get<number>('PRODUCT_SERVICE_PORT'),
          },
        }),
      inject: [ConfigService],
    },
    // TCP Client → Payment Service
    {
      provide: PAYMENT_SERVICE,
      useFactory: (configService: ConfigService) =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('PAYMENT_SERVICE_HOST'),
            port: configService.get<number>('PAYMENT_SERVICE_PORT'),
          },
        }),
      inject: [ConfigService],
    },
  ],
})
export class OrderModule {}
