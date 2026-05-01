// ============================================
// User Service - Module
// ============================================
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigModule, AppConfigService } from '@app/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ORDER_SERVICE, PAYMENT_SERVICE } from '@app/common/constants';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    // Centralized configuration and validation
    AppConfigModule,
    // Connect to user-specific MongoDB database
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.user.mongoUri,
      }),
    }),
    // Register User schema
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    // JWT module for token generation
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
  controllers: [UserController],
  providers: [
    UserService,
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
export class UserModule {}
