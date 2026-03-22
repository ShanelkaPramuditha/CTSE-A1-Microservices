import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsNumber()
  PORT_API_GATEWAY: number;

  @IsString()
  @IsNotEmpty()
  USER_SERVICE_HOST: string;

  @IsNumber()
  USER_SERVICE_PORT: number;

  @IsString()
  @IsNotEmpty()
  PRODUCT_SERVICE_HOST: string;

  @IsNumber()
  PRODUCT_SERVICE_PORT: number;

  @IsString()
  @IsNotEmpty()
  ORDER_SERVICE_HOST: string;

  @IsNumber()
  ORDER_SERVICE_PORT: number;

  @IsString()
  @IsNotEmpty()
  PAYMENT_SERVICE_HOST: string;

  @IsNumber()
  PAYMENT_SERVICE_PORT: number;

  @IsString()
  @IsNotEmpty()
  MONGO_URI_USER: string;

  @IsString()
  @IsNotEmpty()
  MONGO_URI_PRODUCT: string;

  @IsString()
  @IsNotEmpty()
  MONGO_URI_ORDER: string;

  @IsString()
  @IsNotEmpty()
  MONGO_URI_PAYMENT: string;

  @IsString()
  @IsNotEmpty()
  MONGO_URI_CART: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRATION: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
