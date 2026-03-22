// ============================================
// Payment Service - Controller (TCP Message Patterns)
// ============================================
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PAYMENT_PATTERNS } from '@app/common/constants';
import { ProcessPaymentDto } from '@app/common/dto';
import { PaymentService } from './payment.service';

@Controller()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Process a payment (simulated)
   * TCP Pattern: process_payment
   */
  @MessagePattern(PAYMENT_PATTERNS.PROCESS)
  async processPayment(@Payload() processPaymentDto: ProcessPaymentDto) {
    this.logger.log(
      `Processing payment for order: ${processPaymentDto.orderId}, amount: $${processPaymentDto.amount}`,
    );
    return this.paymentService.processPayment(processPaymentDto);
  }

  @MessagePattern(PAYMENT_PATTERNS.GET_BY_USER)
  async getPaymentsByUser(@Payload() data: { userId: string }) {
    this.logger.log(`Fetching payments for user: ${data.userId}`);
    return this.paymentService.getPaymentsByUser(data.userId);
  }
}
