// ============================================
// Payment Service - Business Logic (Simulated)
// ============================================
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { ProcessPaymentDto } from '@app/common/dto';
import { PaymentStatus } from '@app/common/constants';
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  /**
   * Simulate payment processing
   * - 85% chance of success (simulated)
   * - Generates a transaction ID on success
   * - Stores payment record in MongoDB
   */
  async processPayment(processPaymentDto: ProcessPaymentDto) {
    const { orderId, amount, userId } = processPaymentDto;

    // Simulate payment gateway processing delay
    await this.simulateProcessingDelay();

    // Simulate success/failure (85% success rate)
    const isSuccess = Math.random() < 0.85;
    const status = isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    const transactionId = isSuccess ? this.generateTransactionId() : undefined;

    // Create payment record
    const payment = new this.paymentModel({
      orderId,
      userId,
      amount,
      status,
      transactionId,
    });

    const savedPayment = await payment.save();

    if (isSuccess) {
      this.logger.log(
        `✅ Payment SUCCESS for order ${orderId} | Transaction: ${transactionId} | Amount: $${amount}`,
      );
    } else {
      this.logger.warn(
        `❌ Payment FAILED for order ${orderId} | Amount: $${amount}`,
      );
    }

    return savedPayment;
  }

  async getPaymentsByUser(userId: string) {
    return this.paymentModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Simulate processing delay (500ms - 2000ms)
   */
  private simulateProcessingDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 1500) + 500;
    return new Promise((resolve) => setTimeout(resolve, delay));
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
