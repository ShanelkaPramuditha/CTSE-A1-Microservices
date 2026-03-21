// ============================================
// Cart Service - Controller (TCP Message Patterns)
// ============================================
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CART_PATTERNS } from '@app/common/constants';
import {
  AddCartItemDto,
  UpdateCartItemDto,
  RemoveCartItemDto,
} from '@app/common/dto';
import { CartService } from './cart.service';

@Controller()
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(private readonly cartService: CartService) {}

  /**
   * Get user's cart
   * TCP Pattern: get_cart
   */
  @MessagePattern(CART_PATTERNS.GET_CART)
  async getCart(@Payload() data: { userId: string }) {
    this.logger.log(`Fetching cart for user: ${data.userId}`);
    return this.cartService.getCart(data.userId);
  }

  /**
   * Add item to cart
   * TCP Pattern: add_cart_item
   */
  @MessagePattern(CART_PATTERNS.ADD_ITEM)
  async addItem(
    @Payload() data: { userId: string; addCartItemDto: AddCartItemDto },
  ) {
    this.logger.log(
      `Adding item ${data.addCartItemDto.productId} to cart for user: ${data.userId}`,
    );
    return this.cartService.addItem(data.userId, data.addCartItemDto);
  }

  /**
   * Update item quantity in cart
   * TCP Pattern: update_cart_item
   */
  @MessagePattern(CART_PATTERNS.UPDATE_ITEM)
  async updateItem(
    @Payload()
    data: {
      userId: string;
      updateCartItemDto: UpdateCartItemDto;
    },
  ) {
    this.logger.log(
      `Updating item ${data.updateCartItemDto.productId} in cart for user: ${data.userId}`,
    );
    return this.cartService.updateItem(data.userId, data.updateCartItemDto);
  }

  /**
   * Remove item from cart
   * TCP Pattern: remove_cart_item
   */
  @MessagePattern(CART_PATTERNS.REMOVE_ITEM)
  async removeItem(
    @Payload()
    data: {
      userId: string;
      removeCartItemDto: RemoveCartItemDto;
    },
  ) {
    this.logger.log(
      `Removing item ${data.removeCartItemDto.productId} from cart for user: ${data.userId}`,
    );
    return this.cartService.removeItem(data.userId, data.removeCartItemDto);
  }

  /**
   * Clear all items from cart
   * TCP Pattern: clear_cart
   */
  @MessagePattern(CART_PATTERNS.CLEAR_CART)
  async clearCart(@Payload() data: { userId: string }) {
    this.logger.log(`Clearing cart for user: ${data.userId}`);
    return this.cartService.clearCart(data.userId);
  }
}
