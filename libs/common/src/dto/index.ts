// ============================================
// Shared DTOs - Data Transfer Objects
// ============================================
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  MinLength,
  IsArray,
  ValidateNested,
  IsPositive,
  IsOptional,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- User DTOs ---
export class RegisterUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: ['user', 'admin'], default: 'user', required: false })
  @IsOptional()
  @IsEnum(['user', 'admin'])
  role?: string;
}

export class RefreshSessionDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'John Smith', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'john.smith@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'https://www.gravatar.com/avatar/...',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ example: 'newPassword123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

export class LoginUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ListProductsQueryDto {
  @ApiProperty({ required: false, example: 12, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiProperty({ required: false, example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;

  @ApiProperty({ required: false, example: 'Audio' })
  @IsOptional()
  @IsString()
  category?: string;
}

// --- Product DTOs ---

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Headphones' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Premium noise-cancelling wireless headphones' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/products/headphones.jpg',
    description: 'Public URL for the product image',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  imageUrl?: string;
}

// --- Order DTOs ---

export class OrderItemDto {
  @ApiProperty({ example: '65a1b2c3d4e5f6a7b8c9d0e1' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class ShippingAddressDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '0712345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'No 10, Main Street' })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Apartment 2B' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ example: 'Colombo' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '00100' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;
}

export class CardDetailsDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  cardHolderName: string;

  @ApiProperty({ example: '4111111111111111' })
  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @ApiProperty({ example: '12' })
  @IsString()
  @IsNotEmpty()
  expiryMonth: string;

  @ApiProperty({ example: '2028' })
  @IsString()
  @IsNotEmpty()
  expiryYear: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  cvv: string;
}

export class CheckoutDto {
  @ApiProperty({ enum: ['COD', 'CARD'], example: 'COD' })
  @IsEnum(['COD', 'CARD'])
  paymentMethod: 'COD' | 'CARD';

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  address: ShippingAddressDto;

  @ApiPropertyOptional({ type: CardDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardDetailsDto)
  card?: CardDetailsDto;
}

// --- Payment DTOs ---

export class ProcessPaymentDto {
  @ApiProperty({ example: '65a1b2c3d4e5f6a7b8c9d0e1' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: '65a1b2c3d4e5f6a7b8c9d0e1' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 199.98 })
  @IsNumber()
  @IsPositive()
  amount: number;
}

// --- Stock Validation DTO ---

export class ValidateStockDto {
  @ApiProperty({ example: '65a1b2c3d4e5f6a7b8c9d0e1' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

// --- Cart DTOs ---

export class AddCartItemDto {
  @ApiProperty({ example: '65a1b2c3d4e5f6a7b8c9d0e1' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'Wireless Headphones' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsString()
  @IsOptional()
  image?: string;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: '65a1b2c3d4e5f6a7b8c9d0e1' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class RemoveCartItemDto {
  @ApiProperty({ example: '65a1b2c3d4e5f6a7b8c9d0e1' })
  @IsString()
  @IsNotEmpty()
  productId: string;
}
