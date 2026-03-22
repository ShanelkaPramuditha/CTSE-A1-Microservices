// ============================================
// Product Service - Business Logic
// ============================================
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from '@app/common/dto';
import { IStockValidationResult } from '@app/common/interfaces';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  /**
   * Create a new product
   */
  async create(createProductDto: CreateProductDto) {
    const product = new this.productModel(createProductDto);
    const saved = await product.save();
    this.logger.log(`Product created: ${saved.name} (${saved._id})`);
    return saved;
  }

  /**
   * Get all products, sorted by newest first
   */
  async findAll() {
    return this.productModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Find a single product by ID
   */
  async findById(productId: string) {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new RpcException(new NotFoundException('Product not found'));
    }
    return product;
  }

  /**
   * Validate stock availability and return result
   * Also decrements stock if valid (reserve stock)
   */
  async validateStock(
    productId: string,
    quantity: number,
  ): Promise<IStockValidationResult> {
    const product = await this.productModel.findById(productId).exec();

    if (!product) {
      return {
        valid: false,
        productId,
        requestedQuantity: quantity,
      };
    }

    if (product.stock < quantity) {
      return {
        valid: false,
        productId,
        productName: product.name,
        availableStock: product.stock,
        requestedQuantity: quantity,
        price: product.price,
      };
    }

    // Decrement stock (reserve)
    product.stock -= quantity;
    await product.save();

    this.logger.log(
      `Stock reserved: ${product.name} - ${quantity} units (remaining: ${product.stock})`,
    );

    return {
      valid: true,
      productId,
      productName: product.name,
      availableStock: product.stock,
      requestedQuantity: quantity,
      price: product.price,
    };
  }
}
