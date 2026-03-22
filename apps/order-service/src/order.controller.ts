// ============================================
// Order Service - Controller (TCP Message Patterns)
// ============================================
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDER_PATTERNS } from '@app/common/constants';
import { CreateOrderDto } from '@app/common/dto';
import { OrderService } from './order.service';

@Controller()
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  /**
   * Create a new order
   * TCP Pattern: create_order
   * Orchestrates: Product validation → Payment processing
   */
  @MessagePattern(ORDER_PATTERNS.CREATE)
  async createOrder(
    @Payload() data: { userId: string; createOrderDto: CreateOrderDto },
  ) {
    this.logger.log(`Creating order for user: ${data.userId}`);
    return this.orderService.createOrder(data.userId, data.createOrderDto);
  }

  /**
   * Get all orders for a user
   * TCP Pattern: get_orders
   */
  @MessagePattern(ORDER_PATTERNS.GET_ALL)
  async getOrders(@Payload() data: { userId: string }) {
    this.logger.log(`Fetching orders for user: ${data.userId}`);
    return this.orderService.getUserOrders(data.userId);
  }

  /**
   * Update order status (used by Payment Service callback)
   * TCP Pattern: update_order_status
   */
  @MessagePattern(ORDER_PATTERNS.UPDATE_STATUS)
  async updateOrderStatus(
    @Payload() data: { orderId: string; status: string; paymentId?: string },
  ) {
    this.logger.log(
      `Updating order ${data.orderId} status to: ${data.status}`,
    );
    return this.orderService.updateOrderStatus(
      data.orderId,
      data.status,
      data.paymentId,
    );
  }
}
