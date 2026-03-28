// ============================================
// Payment Service - Module
// ============================================
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import {
  AppConfigModule,
  AppConfigService,
  ORDER_SERVICE,
  USER_SERVICE,
} from '@app/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    AppConfigModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI_PAYMENT'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,

    // TCP Client → Order Service (for order status validation)
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

    // TCP Client → User Service (for user validation)
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
  ],
})
export class PaymentModule {}
