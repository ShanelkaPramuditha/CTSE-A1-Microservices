// ============================================
// Product Service - Business Logic
// ============================================
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { firstValueFrom, of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { ORDER_SERVICE, ORDER_PATTERNS } from '@app/common/constants';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from '@app/common/dto';
import { IStockValidationResult } from '@app/common/interfaces';

type ProductOrderStatRow = {
  productId: string;
  orderCount: number;
  orderedQuantity: number;
};

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private readonly DEFAULT_LIMIT = 12;
  private readonly MAX_LIMIT = 48;

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @Inject(ORDER_SERVICE) private readonly orderClient: ClientProxy,
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
  async findAll(limit = this.DEFAULT_LIMIT, offset = 0) {
    return this.findMany({}, limit, offset);
  }

  async findByCategory(
    category: string,
    limit = this.DEFAULT_LIMIT,
    offset = 0,
  ) {
    const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return this.findMany(
      {
        category: {
          $regex: `^${escapedCategory}$`,
          $options: 'i',
        },
      },
      limit,
      offset,
    );
  }

  private async findMany(
    filter: Record<string, unknown>,
    limit = this.DEFAULT_LIMIT,
    offset = 0,
  ) {
    const safeLimit = Math.min(
      Math.max(Number(limit) || this.DEFAULT_LIMIT, 1),
      this.MAX_LIMIT,
    );
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const [products, total, categories] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
      this.productModel.distinct('category').exec(),
    ]);

    const data = await this.attachOrderAvailability(products);

    return {
      data,
      total,
      limit: safeLimit,
      offset: safeOffset,
      hasMore: safeOffset + data.length < total,
      categories: Array.isArray(categories)
        ? categories
            .filter(
              (category): category is string => typeof category === 'string',
            )
            .map((category) => category.trim())
            .filter((category) => category.length > 0)
            .sort((left, right) => left.localeCompare(right))
        : [],
    };
  }

  /**
   * Find a single product by ID
   */
  async findById(productId: string) {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new RpcException(new NotFoundException('Product not found'));
    }
    const [enriched] = await this.attachOrderAvailability([product]);
    return enriched;
  }

  private async fetchOrderStatsByProductId(
    productIds: string[],
  ): Promise<Map<string, ProductOrderStatRow>> {
    const map = new Map<string, ProductOrderStatRow>();
    if (productIds.length === 0) {
      return map;
    }
    try {
      const rows = await firstValueFrom(
        this.orderClient
          .send<
            ProductOrderStatRow[]
          >(ORDER_PATTERNS.GET_PRODUCTS_ORDER_STATS, { productIds })
          .pipe(
            timeout(5000),
            catchError((err) => {
              const msg = err instanceof Error ? err.message : String(err);
              this.logger.warn(
                `Order service unavailable; omitting order stats (${msg})`,
              );
              return of([]);
            }),
          ),
      );
      const list = Array.isArray(rows) ? rows : [];
      for (const row of list) {
        if (row?.productId != null) {
          map.set(String(row.productId), {
            productId: String(row.productId),
            orderCount: Number(row.orderCount) || 0,
            orderedQuantity: Number(row.orderedQuantity) || 0,
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Order service unavailable; omitting order stats (${msg})`,
      );
    }
    return map;
  }

  /**
   * Adds totalOrders, orderedQuantity, availableStock (stock − ordered units on open/paid orders).
   */
  private async attachOrderAvailability(products: ProductDocument[]) {
    if (products.length === 0) {
      return [];
    }
    const ids = products.map((p) => p._id.toString());
    const statsById = await this.fetchOrderStatsByProductId(ids);

    return products.map((p) => {
      const id = p._id.toString();
      const stat = statsById.get(id) ?? {
        productId: id,
        orderCount: 0,
        orderedQuantity: 0,
      };
      const orderedQty = stat.orderedQuantity;
      const base = p.toObject();
      return {
        ...base,
        totalOrders: stat.orderCount,
        orderedQuantity: orderedQty,
        availableStock: Math.max(0, p.stock - orderedQty),
      };
    });
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
