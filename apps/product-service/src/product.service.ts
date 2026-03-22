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
import { CreateProductDto, PaginationQueryDto } from '@app/common/dto';
import {
  IProduct,
  IPaginatedResponse,
  IStockValidationResult,
} from '@app/common/interfaces';

type ProductOrderStatRow = {
  productId: string;
  orderCount: number;
  orderedQuantity: number;
};

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

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
   * Get products, sorted by newest first, using offset pagination
   */
  async findAll(
    pagination: PaginationQueryDto = {},
  ): Promise<IPaginatedResponse<IProduct>> {
    const skip = Math.max(0, Number(pagination.skip ?? 0));
    const limit = Math.min(100, Math.max(1, Number(pagination.limit ?? 20)));

    const [total, products] = await Promise.all([
      this.productModel.countDocuments().exec(),
      this.productModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    const data = await this.attachOrderAvailability(products);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data,
      total,
      totalPages,
      page: total === 0 ? 0 : Math.floor(skip / limit),
      hasMore: skip + limit < total,
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
          .send<ProductOrderStatRow[]>(
            ORDER_PATTERNS.GET_PRODUCTS_ORDER_STATS,
            { productIds },
          )
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
      const { _id, ...base } = p.toObject();
      return {
        ...base,
        _id: id,
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
