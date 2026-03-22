import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './env.validation';

@Injectable()
export class AppConfigService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  get apiGateway() {
    return {
      port: this.configService.get('PORT_API_GATEWAY', { infer: true }),
    };
  }

  get user() {
    return {
      host: this.configService.get('USER_SERVICE_HOST', { infer: true }),
      port: this.configService.get('USER_SERVICE_PORT', { infer: true }),
      mongoUri: this.configService.get('MONGO_URI_USER', { infer: true }),
    };
  }

  get product() {
    return {
      host: this.configService.get('PRODUCT_SERVICE_HOST', { infer: true }),
      port: this.configService.get('PRODUCT_SERVICE_PORT', { infer: true }),
      mongoUri: this.configService.get('MONGO_URI_PRODUCT', { infer: true }),
    };
  }

  get order() {
    return {
      host: this.configService.get('ORDER_SERVICE_HOST', { infer: true }),
      port: this.configService.get('ORDER_SERVICE_PORT', { infer: true }),
      mongoUri: this.configService.get('MONGO_URI_ORDER', { infer: true }),
    };
  }

  get payment() {
    return {
      host: this.configService.get('PAYMENT_SERVICE_HOST', { infer: true }),
      port: this.configService.get('PAYMENT_SERVICE_PORT', { infer: true }),
      mongoUri: this.configService.get('MONGO_URI_PAYMENT', { infer: true }),
    };
  }

  get cart() {
    return {
      mongoUri: this.configService.get('MONGO_URI_CART', { infer: true }),
    };
  }

  get jwt() {
    return {
      secret: this.configService.get('JWT_SECRET', { infer: true }),
      expiration: this.configService.get('JWT_EXPIRATION', { infer: true }),
    };
  }
}
