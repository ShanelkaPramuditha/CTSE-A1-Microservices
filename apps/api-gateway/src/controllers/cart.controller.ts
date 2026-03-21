// ============================================
// API Gateway - Cart Controller (Authenticated Routes)
// ============================================
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
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
} from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CART_SERVICE, CART_PATTERNS } from '@app/common/constants';
import {
  AddCartItemDto,
  UpdateCartItemDto,
  RemoveCartItemDto,
} from '@app/common/dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Cart')
@ApiCookieAuth()
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(@Inject(CART_SERVICE) private readonly cartClient: ClientProxy) {}

  /**
   * GET /api/v1/cart
   * Get current user's cart
   */
  @Get()
  @ApiOperation({ summary: "Get current user's cart" })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  async getCart(@CurrentUser('userId') userId: string) {
    this.logger.log(`Get cart for user: ${userId}`);
    return firstValueFrom(
      this.cartClient.send(CART_PATTERNS.GET_CART, { userId }),
    );
  }

  /**
   * POST /api/v1/cart/items
   * Add item to cart
   */
  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  async addItem(
    @CurrentUser('userId') userId: string,
    @Body() addCartItemDto: AddCartItemDto,
  ) {
    this.logger.log(
      `Add item ${addCartItemDto.productId} to cart for user: ${userId}`,
    );
    return firstValueFrom(
      this.cartClient.send(CART_PATTERNS.ADD_ITEM, {
        userId,
        addCartItemDto,
      }),
    );
  }

  /**
   * PATCH /api/v1/cart/items
   * Update item quantity in cart
   */
  @Patch('items')
  @ApiOperation({ summary: 'Update item quantity in cart' })
  @ApiResponse({ status: 200, description: 'Item quantity updated' })
  async updateItem(
    @CurrentUser('userId') userId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    this.logger.log(
      `Update item ${updateCartItemDto.productId} in cart for user: ${userId}`,
    );
    return firstValueFrom(
      this.cartClient.send(CART_PATTERNS.UPDATE_ITEM, {
        userId,
        updateCartItemDto,
      }),
    );
  }

  /**
   * DELETE /api/v1/cart/items
   * Remove item from cart
   */
  @Delete('items')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  async removeItem(
    @CurrentUser('userId') userId: string,
    @Body() removeCartItemDto: RemoveCartItemDto,
  ) {
    this.logger.log(
      `Remove item ${removeCartItemDto.productId} from cart for user: ${userId}`,
    );
    return firstValueFrom(
      this.cartClient.send(CART_PATTERNS.REMOVE_ITEM, {
        userId,
        removeCartItemDto,
      }),
    );
  }

  /**
   * DELETE /api/v1/cart
   * Clear entire cart
   */
  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@CurrentUser('userId') userId: string) {
    this.logger.log(`Clear cart for user: ${userId}`);
    return firstValueFrom(
      this.cartClient.send(CART_PATTERNS.CLEAR_CART, { userId }),
    );
  }
}
