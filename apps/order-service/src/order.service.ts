// ============================================
// Order Service - Business Logic
// ============================================
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Cart, CartDocument, Order, OrderDocument } from './schemas/schemas';
import {
  AddCartItemDto,
  UpdateCartItemDto,
  RemoveCartItemDto,
  CreateOrderDto,
} from '@app/common/dto';
import {
  PRODUCT_SERVICE,
  PAYMENT_SERVICE,
  PRODUCT_PATTERNS,
  PAYMENT_PATTERNS,
  OrderStatus,
} from '@app/common/constants';
import { IStockValidationResult } from '@app/common/interfaces';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectModel(Cart.name, 'cart')
    private readonly cartModel: Model<CartDocument>,
    @InjectModel(Order.name, 'order')
    private readonly orderModel: Model<OrderDocument>,
    @Inject(PRODUCT_SERVICE)
    private readonly productClient: ClientProxy,
    @Inject(PAYMENT_SERVICE)
    private readonly paymentClient: ClientProxy,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private calculateTotal(items: { price: number; quantity: number }[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // ─── Cart Operations ────────────────────────────────────────────────────────

  async getCart(userId: string) {
    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [], totalAmount: 0 });
      await cart.save();
    }
    return {
      _id: cart._id,
      userId: cart.userId,
      items: cart.items,
      totalAmount: cart.totalAmount,
    };
  }

  async addItem(userId: string, addCartItemDto: AddCartItemDto) {
    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [], totalAmount: 0 });
    }

    const existingIdx = cart.items.findIndex(
      (i) => i.productId === addCartItemDto.productId,
    );

    if (existingIdx > -1) {
      cart.items[existingIdx].quantity += addCartItemDto.quantity;
      cart.items[existingIdx].price = addCartItemDto.price;
    } else {
      cart.items.push({
        productId: addCartItemDto.productId,
        productName: addCartItemDto.productName,
        price: addCartItemDto.price,
        quantity: addCartItemDto.quantity,
        image: addCartItemDto.image,
      });
    }

    cart.totalAmount = this.calculateTotal(cart.items);
    const saved = await cart.save();
    this.logger.log(`Added ${addCartItemDto.productId} to cart for user ${userId}`);
    return { _id: saved._id, userId: saved.userId, items: saved.items, totalAmount: saved.totalAmount };
  }

  async updateItem(userId: string, updateCartItemDto: UpdateCartItemDto) {
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) throw new RpcException(new NotFoundException('Cart not found'));

    const idx = cart.items.findIndex((i) => i.productId === updateCartItemDto.productId);
    if (idx === -1) throw new RpcException(new NotFoundException('Item not found in cart'));

    cart.items[idx].quantity = updateCartItemDto.quantity;
    cart.totalAmount = this.calculateTotal(cart.items);
    const saved = await cart.save();
    return { _id: saved._id, userId: saved.userId, items: saved.items, totalAmount: saved.totalAmount };
  }

  async removeItem(userId: string, removeCartItemDto: RemoveCartItemDto) {
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) throw new RpcException(new NotFoundException('Cart not found'));

    const idx = cart.items.findIndex((i) => i.productId === removeCartItemDto.productId);
    if (idx === -1) throw new RpcException(new NotFoundException('Item not found in cart'));

    cart.items.splice(idx, 1);
    cart.totalAmount = this.calculateTotal(cart.items);
    const saved = await cart.save();
    return { _id: saved._id, userId: saved.userId, items: saved.items, totalAmount: saved.totalAmount };
  }

  async clearCart(userId: string) {
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) throw new RpcException(new NotFoundException('Cart not found'));

    cart.items = [];
    cart.totalAmount = 0;
    const saved = await cart.save();
    return { _id: saved._id, userId: saved.userId, items: saved.items, totalAmount: saved.totalAmount };
  }

  // ─── Order Operations ───────────────────────────────────────────────────────

  /**
   * Checkout: read the user's cart → validate stock via Product Service
   * → create order → clear cart → trigger payment via Payment Service
   */
  async checkout(userId: string) {
    this.logger.log(`Checkout initiated for user: ${userId}`);

    // 1. Load cart
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart || cart.items.length === 0) {
      throw new RpcException(new BadRequestException('Cart is empty'));
    }

    // 2. Validate stock for every item in the cart
    const validatedItems: {
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }[] = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      let stockResult: IStockValidationResult;

      try {
        stockResult = await firstValueFrom(
          this.productClient.send<IStockValidationResult>(
            PRODUCT_PATTERNS.VALIDATE_STOCK,
            { productId: item.productId, quantity: item.quantity },
          ),
        );
      } catch {
        // Product service unavailable — fall back to cart price, skip validation
        this.logger.warn(
          `Product service unreachable; using cart price for ${item.productId}`,
        );
        stockResult = {
          valid: true,
          productId: item.productId,
          productName: item.productName,
          requestedQuantity: item.quantity,
          availableStock: undefined,
          price: item.price,
        };
      }

      if (!stockResult.valid) {
        throw new RpcException(
          new BadRequestException(
            `Insufficient stock for "${stockResult.productName ?? item.productId}". ` +
              `Requested: ${item.quantity}, Available: ${stockResult.availableStock ?? 0}`,
          ),
        );
      }

      const price = stockResult.price ?? item.price;
      validatedItems.push({
        productId: item.productId,
        productName: stockResult.productName ?? item.productName,
        quantity: item.quantity,
        price,
      });
      totalAmount += price * item.quantity;
    }

    // 3. Create order record
    const order = new this.orderModel({
      userId,
      items: validatedItems,
      totalAmount,
      status: OrderStatus.PENDING,
    });
    const savedOrder = await order.save();
    this.logger.log(`Order created: ${savedOrder._id}, total: $${totalAmount}`);

    // 4. Clear the cart now that the order is placed
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();
    this.logger.log(`Cart cleared for user: ${userId}`);

    // 5. Trigger payment
    try {
      const paymentResult = await firstValueFrom(
        this.paymentClient.send(PAYMENT_PATTERNS.PROCESS, {
          orderId: savedOrder._id.toString(),
          amount: totalAmount,
        }),
      );

      savedOrder.status =
        paymentResult.status === 'SUCCESS'
          ? OrderStatus.PAID
          : OrderStatus.PAYMENT_FAILED;
      if (paymentResult._id) savedOrder.paymentId = paymentResult._id;
      await savedOrder.save();
      this.logger.log(`Payment ${paymentResult.status} for order ${savedOrder._id}`);
    } catch (err) {
      savedOrder.status = OrderStatus.PAYMENT_FAILED;
      await savedOrder.save();
      this.logger.error(`Payment failed for order ${savedOrder._id}: ${err?.message}`);
    }

    return savedOrder;
  }

  /**
   * Create order directly from an explicit item list (without touching the cart).
   * Validates stock and processes payment the same way as checkout.
   */
  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    this.logger.log(`Direct order creation for user: ${userId}`);

    const validatedItems: {
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }[] = [];
    let totalAmount = 0;

    for (const item of createOrderDto.items) {
      let stockResult: IStockValidationResult;

      try {
        stockResult = await firstValueFrom(
          this.productClient.send<IStockValidationResult>(
            PRODUCT_PATTERNS.VALIDATE_STOCK,
            { productId: item.productId, quantity: item.quantity },
          ),
        );
      } catch {
        throw new RpcException(
          new BadRequestException('Product service is unavailable. Please try again later.'),
        );
      }

      if (!stockResult.valid) {
        throw new RpcException(
          new BadRequestException(
            `Insufficient stock for "${stockResult.productName ?? item.productId}". ` +
              `Requested: ${item.quantity}, Available: ${stockResult.availableStock ?? 0}`,
          ),
        );
      }

      const price = stockResult.price ?? 0;
      validatedItems.push({
        productId: item.productId,
        productName: stockResult.productName ?? item.productId,
        quantity: item.quantity,
        price,
      });
      totalAmount += price * item.quantity;
    }

    const order = new this.orderModel({
      userId,
      items: validatedItems,
      totalAmount,
      status: OrderStatus.PENDING,
    });
    const savedOrder = await order.save();

    try {
      const paymentResult = await firstValueFrom(
        this.paymentClient.send(PAYMENT_PATTERNS.PROCESS, {
          orderId: savedOrder._id.toString(),
          amount: totalAmount,
        }),
      );

      savedOrder.status =
        paymentResult.status === 'SUCCESS'
          ? OrderStatus.PAID
          : OrderStatus.PAYMENT_FAILED;
      if (paymentResult._id) savedOrder.paymentId = paymentResult._id;
      await savedOrder.save();
    } catch {
      savedOrder.status = OrderStatus.PAYMENT_FAILED;
      await savedOrder.save();
    }

    return savedOrder;
  }

  async getUserOrders(userId: string) {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async updateOrderStatus(orderId: string, status: string, paymentId?: string) {
    const updateData: Record<string, string> = { status };
    if (paymentId) updateData.paymentId = paymentId;

    const order = await this.orderModel
      .findByIdAndUpdate(orderId, updateData, { new: true })
      .exec();

    if (!order) {
      throw new RpcException(new BadRequestException('Order not found'));
    }

    this.logger.log(`Order ${orderId} status → ${status}`);
    return order;
  }
}
