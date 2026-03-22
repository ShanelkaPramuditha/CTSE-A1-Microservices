// ============================================
// Order Service - Business Logic (Orchestrator)
// ============================================
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { Inject } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from '@app/common/dto';
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
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @Inject(PRODUCT_SERVICE)
    private readonly productClient: ClientProxy,
    @Inject(PAYMENT_SERVICE)
    private readonly paymentClient: ClientProxy,
  ) {}

  /**
   * Create order with full orchestration:
   * 1. Validate stock for each item via Product Service
   * 2. Calculate total amount
   * 3. Create order record
   * 4. Process payment via Payment Service
   * 5. Update order with payment result
   */
  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    this.logger.log(`Starting order creation for user: ${userId}`);

    // Step 1: Validate stock for each item
    const validatedItems = [];
    let totalAmount = 0;

    for (const item of createOrderDto.items) {
      const stockResult = await firstValueFrom(
        this.productClient.send<IStockValidationResult>(
          PRODUCT_PATTERNS.VALIDATE_STOCK,
          {
            productId: item.productId,
            quantity: item.quantity,
          },
        ),
      );

      if (!stockResult.valid) {
        throw new RpcException(
          new BadRequestException(
            `Insufficient stock for product ${stockResult.productName || item.productId}. ` +
            `Requested: ${item.quantity}, Available: ${stockResult.availableStock ?? 0}`,
          ),
        );
      }

      validatedItems.push({
        productId: item.productId,
        productName: stockResult.productName,
        quantity: item.quantity,
        price: stockResult.price,
      });

      totalAmount += (stockResult.price ?? 0) * item.quantity;
    }

    // Step 2: Create order record with PENDING status
    const order = new this.orderModel({
      userId,
      items: validatedItems,
      totalAmount,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await order.save();
    this.logger.log(`Order created: ${savedOrder._id}, total: $${totalAmount}`);

    // Step 3: Process payment asynchronously
    try {
      const paymentResult = await firstValueFrom(
        this.paymentClient.send(PAYMENT_PATTERNS.PROCESS, {
          orderId: savedOrder._id.toString(),
          amount: totalAmount,
        }),
      );

      // Step 4: Update order based on payment result
      if (paymentResult.status === 'SUCCESS') {
        savedOrder.status = OrderStatus.PAID;
        savedOrder.paymentId = paymentResult._id;
      } else {
        savedOrder.status = OrderStatus.PAYMENT_FAILED;
      }

      await savedOrder.save();
      this.logger.log(
        `Order ${savedOrder._id} payment ${paymentResult.status}`,
      );

      return savedOrder;
    } catch (error) {
      // Payment failed — mark order accordingly
      savedOrder.status = OrderStatus.PAYMENT_FAILED;
      await savedOrder.save();
      this.logger.error(
        `Payment failed for order ${savedOrder._id}: ${error.message}`,
      );
      return savedOrder;
    }
  }

  /**
   * Get all orders for a specific user
   */
  async getUserOrders(userId: string) {
    return this.orderModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Update order status (used by payment callbacks)
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    paymentId?: string,
  ) {
    const updateData: any = { status };
    if (paymentId) {
      updateData.paymentId = paymentId;
    }

    const order = await this.orderModel
      .findByIdAndUpdate(orderId, updateData, { new: true })
      .exec();

    if (!order) {
      throw new RpcException(
        new BadRequestException('Order not found'),
      );
    }

    this.logger.log(`Order ${orderId} status updated to: ${status}`);
    return order;
  }
}
