// ============================================
// Order Service - Controller (TCP Message Patterns)
// ============================================
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CART_PATTERNS, ORDER_PATTERNS } from '@app/common/constants';
import {
  AddCartItemDto,
  UpdateCartItemDto,
  RemoveCartItemDto,
  CreateOrderDto,
} from '@app/common/dto';
import { OrderService } from './order.service';

@Controller()
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  // ─── Cart Patterns ───────────────────────────────────────────────────────────

  @MessagePattern(CART_PATTERNS.GET_CART)
  getCart(@Payload() data: { userId: string }) {
    this.logger.log(`[get_cart] userId=${data.userId}`);
    return this.orderService.getCart(data.userId);
  }

  @MessagePattern(CART_PATTERNS.ADD_ITEM)
  addItem(@Payload() data: { userId: string; addCartItemDto: AddCartItemDto }) {
    this.logger.log(
      `[add_cart_item] userId=${data.userId} product=${data.addCartItemDto.productId}`,
    );
    return this.orderService.addItem(data.userId, data.addCartItemDto);
  }

  @MessagePattern(CART_PATTERNS.UPDATE_ITEM)
  updateItem(
    @Payload() data: { userId: string; updateCartItemDto: UpdateCartItemDto },
  ) {
    this.logger.log(
      `[update_cart_item] userId=${data.userId} product=${data.updateCartItemDto.productId}`,
    );
    return this.orderService.updateItem(data.userId, data.updateCartItemDto);
  }

  @MessagePattern(CART_PATTERNS.REMOVE_ITEM)
  removeItem(
    @Payload() data: { userId: string; removeCartItemDto: RemoveCartItemDto },
  ) {
    this.logger.log(
      `[remove_cart_item] userId=${data.userId} product=${data.removeCartItemDto.productId}`,
    );
    return this.orderService.removeItem(data.userId, data.removeCartItemDto);
  }

  @MessagePattern(CART_PATTERNS.CLEAR_CART)
  clearCart(@Payload() data: { userId: string }) {
    this.logger.log(`[clear_cart] userId=${data.userId}`);
    return this.orderService.clearCart(data.userId);
  }

  // ─── Order Patterns ─────────────────────────────────────────────────────────

  /**
   * Checkout the user's current cart:
   * validate stock → create order → clear cart → process payment
   */
  @MessagePattern(ORDER_PATTERNS.CHECKOUT)
  checkout(@Payload() data: { userId: string }) {
    this.logger.log(`[checkout] userId=${data.userId}`);
    return this.orderService.checkout(data.userId);
  }

  /**
   * Place an order from an explicit item list (bypasses cart)
   */
  @MessagePattern(ORDER_PATTERNS.CREATE)
  createOrder(
    @Payload() data: { userId: string; createOrderDto: CreateOrderDto },
  ) {
    this.logger.log(`[create_order] userId=${data.userId}`);
    return this.orderService.createOrder(data.userId, data.createOrderDto);
  }

  @MessagePattern(ORDER_PATTERNS.GET_ALL)
  getOrders(@Payload() data: { userId: string }) {
    this.logger.log(`[get_orders] userId=${data.userId}`);
    return this.orderService.getUserOrders(data.userId);
  }

  @MessagePattern(ORDER_PATTERNS.GET_BY_USER)
  getOrdersByUser(@Payload() data: { userId: string }) {
    this.logger.log(`[get_orders_by_user] userId=${data.userId}`);
    return this.orderService.getUserOrders(data.userId);
  }

  @MessagePattern(ORDER_PATTERNS.UPDATE_STATUS)
  updateOrderStatus(
    @Payload() data: { orderId: string; status: string; paymentId?: string },
  ) {
    this.logger.log(
      `[update_order_status] orderId=${data.orderId} → ${data.status}`,
    );
    return this.orderService.updateOrderStatus(
      data.orderId,
      data.status,
      data.paymentId,
    );
  }

  /**
   * Batch order stats per product (for product catalog availability)
   * TCP Pattern: get_products_order_stats
   */
  @MessagePattern(ORDER_PATTERNS.GET_PRODUCTS_ORDER_STATS)
  getProductsOrderStats(@Payload() data: { productIds: string[] }) {
    const ids = data?.productIds ?? [];
    this.logger.log(`[get_products_order_stats] count=${ids.length}`);
    return this.orderService.getProductsOrderStats(ids);
  }
}
