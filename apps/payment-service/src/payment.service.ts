// ============================================
// Payment Service - Business Logic (Simulated)
// ============================================
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { ProcessPaymentDto } from '@app/common/dto';
import {
  ORDER_PATTERNS,
  ORDER_SERVICE,
  USER_PATTERNS,
  USER_SERVICE,
  OrderStatus,
  PaymentStatus,
} from '@app/common/constants';
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @Inject(ORDER_SERVICE)
    private readonly orderClient: ClientProxy,
    @Inject(USER_SERVICE)
    private readonly userClient: ClientProxy,
  ) {}

  /**
   * Process payment
   * - Validates user
   * - Generates a transaction ID
   * - Stores payment record in MongoDB
   * - Updates order status
   */
  async processPayment(processPaymentDto: ProcessPaymentDto) {
    const { orderId, amount, userId } = processPaymentDto;

    // 1. Validate user exists
    try {
      await firstValueFrom(
        this.userClient.send(USER_PATTERNS.VALIDATE_USER, { userId }),
      );
      this.logger.log(`User ${userId} validated for payment`);
    } catch (error) {
      this.logger.error(`User validation failed for userId: ${userId}`, error);
      throw new Error('User validation failed');
    }

    // Process payment (always successful)
    const status = PaymentStatus.SUCCESS;
    const transactionId = this.generateTransactionId();

    // Create payment record
    const payment = new this.paymentModel({
      orderId,
      userId,
      amount,
      status,
      transactionId,
    });

    const savedPayment = await payment.save();

    // Update order status to PAID
    await firstValueFrom(
      this.orderClient.send(ORDER_PATTERNS.UPDATE_STATUS, {
        orderId,
        status: OrderStatus.PAID,
        paymentId: savedPayment._id,
      }),
    );

    this.logger.log(
      `✅ Payment SUCCESS for order ${orderId} | Transaction: ${transactionId} | Amount: $${amount}`,
    );

    return {
      status: savedPayment.status,
      _id: savedPayment._id.toString(),
    };
  }

  async getPaymentsByUser(userId: string) {
    return this.paymentModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Generate a unique transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }
}
