// ============================================
// API Gateway - Order Controller (Authenticated Routes)
// ============================================
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Inject,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { ORDER_SERVICE, ORDER_PATTERNS } from '@app/common/constants';
import { CheckoutDto, CreateOrderDto } from '@app/common/dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserRole } from '@app/common/interfaces';

@ApiTags('Orders')
@ApiCookieAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(
    @Inject(ORDER_SERVICE) private readonly orderClient: ClientProxy,
  ) {}

  /**
   * POST /api/v1/orders/checkout
   * Converts the user's current cart into an order:
   *   validates stock (via Product Service) → creates order → clears cart → processes payment
   */
  @Post('checkout')
  @ApiOperation({
    summary: 'Checkout cart',
    description:
      'Converts the current cart into an order. Validates stock, processes payment, and clears the cart on success.',
  })
  @ApiResponse({ status: 201, description: 'Order placed successfully' })
  @ApiResponse({ status: 400, description: 'Cart is empty or insufficient stock' })
  async checkout(
    @CurrentUser('userId') userId: string,
    @Body() checkoutDto: CheckoutDto,
  ) {
    this.logger.log(`Checkout requested by user: ${userId}`);
    return firstValueFrom(
      this.orderClient.send(ORDER_PATTERNS.CHECKOUT, { userId, checkoutDto }),
    );
  }

  /**
   * GET /api/v1/orders
   * Get all orders for the authenticated user
   */
  @Get()
  @ApiOperation({ summary: "Get current user's orders" })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getOrders(@CurrentUser('userId') userId: string) {
    this.logger.log(`Get orders for user: ${userId}`);
    return firstValueFrom(
      this.orderClient.send(ORDER_PATTERNS.GET_ALL, { userId }),
    );
  }

  /**
   * POST /api/v1/orders
   * Place an order directly from an explicit item list (bypasses cart).
   * Requires the product service to be available for stock validation.
   */
  @Post()
  @ApiOperation({
    summary: 'Create order directly',
    description: 'Place an order from an explicit list of items (bypasses cart). Stock is validated via the Product Service.',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(
    @CurrentUser('userId') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    this.logger.log(`Direct order creation for user: ${userId}`);
    return firstValueFrom(
      this.orderClient.send(ORDER_PATTERNS.CREATE, { userId, createOrderDto }),
    );
  }

  /**
   * PATCH /api/v1/orders/:orderId/status
   * Update order status — admin only, or called internally by the Payment Service callback.
   */
  @Patch(':orderId/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update order status (admin)' })
  @ApiParam({ name: 'orderId', description: 'MongoDB ObjectId of the order' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: string; paymentId?: string },
  ) {
    this.logger.log(`Update order ${orderId} → ${body.status}`);
    return firstValueFrom(
      this.orderClient.send(ORDER_PATTERNS.UPDATE_STATUS, {
        orderId,
        status: body.status,
        paymentId: body.paymentId,
      }),
    );
  }
}
