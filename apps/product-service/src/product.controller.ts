// ============================================
// Product Service - Controller (TCP Message Patterns)
// ============================================
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PRODUCT_PATTERNS } from '@app/common/constants';
import {
  CreateProductDto,
  PaginationQueryDto,
  ValidateStockDto,
} from '@app/common/dto';
import { ProductService } from './product.service';

@Controller()
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) {}

  /**
   * Create a new product
   * TCP Pattern: create_product
   */
  @MessagePattern(PRODUCT_PATTERNS.CREATE)
  async createProduct(@Payload() createProductDto: CreateProductDto) {
    this.logger.log(`Creating product: ${createProductDto.name}`);
    return this.productService.create(createProductDto);
  }

  /**
   * Get all products
   * TCP Pattern: get_products
   */
  @MessagePattern(PRODUCT_PATTERNS.GET_ALL)
  async getProducts(@Payload() pagination: PaginationQueryDto) {
    const skip = pagination?.skip ?? 0;
    const limit = pagination?.limit ?? 20;
    this.logger.log(`Fetching products skip=${skip} limit=${limit}`);
    return this.productService.findAll(pagination);
  }

  /**
   * Get product by ID
   * TCP Pattern: get_product_by_id
   */
  @MessagePattern(PRODUCT_PATTERNS.GET_BY_ID)
  async getProductById(@Payload() data: { productId: string }) {
    this.logger.log(`Fetching product: ${data.productId}`);
    return this.productService.findById(data.productId);
  }

  /**
   * Validate stock availability for an order item
   * TCP Pattern: validate_stock
   */
  @MessagePattern(PRODUCT_PATTERNS.VALIDATE_STOCK)
  async validateStock(@Payload() data: ValidateStockDto) {
    this.logger.log(
      `Validating stock for product: ${data.productId}, qty: ${data.quantity}`,
    );
    return this.productService.validateStock(data.productId, data.quantity);
  }
}
