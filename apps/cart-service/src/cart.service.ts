// ============================================
// Cart Service - Business Logic
// ============================================
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Cart, CartDocument } from './schemas/cart.schema';
import {
  AddCartItemDto,
  UpdateCartItemDto,
  RemoveCartItemDto,
} from '@app/common/dto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
  ) {}

  /**
   * Recalculate total amount from cart items
   */
  private calculateTotal(items: { price: number; quantity: number }[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  /**
   * Get user's cart (create if not exists)
   */
  async getCart(userId: string) {
    let cart = await this.cartModel.findOne({ userId }).exec();

    if (!cart) {
      cart = new this.cartModel({ userId, items: [], totalAmount: 0 });
      await cart.save();
    }

    this.logger.log(`Fetched cart for user: ${userId}`);
    return {
      _id: cart._id,
      userId: cart.userId,
      items: cart.items,
      totalAmount: cart.totalAmount,
    };
  }

  /**
   * Add an item to the cart (or increase quantity if already exists)
   */
  async addItem(userId: string, addCartItemDto: AddCartItemDto) {
    let cart = await this.cartModel.findOne({ userId }).exec();

    if (!cart) {
      cart = new this.cartModel({ userId, items: [], totalAmount: 0 });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId === addCartItemDto.productId,
    );

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      cart.items[existingItemIndex].quantity += addCartItemDto.quantity;
      // Also update price in case it changed
      cart.items[existingItemIndex].price = addCartItemDto.price;
    } else {
      // Add new item
      cart.items.push({
        productId: addCartItemDto.productId,
        productName: addCartItemDto.productName,
        price: addCartItemDto.price,
        quantity: addCartItemDto.quantity,
        image: addCartItemDto.image,
      });
    }

    cart.totalAmount = this.calculateTotal(cart.items);
    const savedCart = await cart.save();

    this.logger.log(
      `Added item ${addCartItemDto.productId} to cart for user ${userId}`,
    );
    return {
      _id: savedCart._id,
      userId: savedCart.userId,
      items: savedCart.items,
      totalAmount: savedCart.totalAmount,
    };
  }

  /**
   * Update item quantity in cart
   */
  async updateItem(userId: string, updateCartItemDto: UpdateCartItemDto) {
    const cart = await this.cartModel.findOne({ userId }).exec();

    if (!cart) {
      throw new RpcException(new NotFoundException('Cart not found'));
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId === updateCartItemDto.productId,
    );

    if (itemIndex === -1) {
      throw new RpcException(new NotFoundException('Item not found in cart'));
    }

    cart.items[itemIndex].quantity = updateCartItemDto.quantity;
    cart.totalAmount = this.calculateTotal(cart.items);
    const savedCart = await cart.save();

    this.logger.log(
      `Updated item ${updateCartItemDto.productId} qty to ${updateCartItemDto.quantity} for user ${userId}`,
    );
    return {
      _id: savedCart._id,
      userId: savedCart.userId,
      items: savedCart.items,
      totalAmount: savedCart.totalAmount,
    };
  }

  /**
   * Remove an item from cart
   */
  async removeItem(userId: string, removeCartItemDto: RemoveCartItemDto) {
    const cart = await this.cartModel.findOne({ userId }).exec();

    if (!cart) {
      throw new RpcException(new NotFoundException('Cart not found'));
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId === removeCartItemDto.productId,
    );

    if (itemIndex === -1) {
      throw new RpcException(new NotFoundException('Item not found in cart'));
    }

    cart.items.splice(itemIndex, 1);
    cart.totalAmount = this.calculateTotal(cart.items);
    const savedCart = await cart.save();

    this.logger.log(
      `Removed item ${removeCartItemDto.productId} from cart for user ${userId}`,
    );
    return {
      _id: savedCart._id,
      userId: savedCart.userId,
      items: savedCart.items,
      totalAmount: savedCart.totalAmount,
    };
  }

  /**
   * Clear all items from cart
   */
  async clearCart(userId: string) {
    const cart = await this.cartModel.findOne({ userId }).exec();

    if (!cart) {
      throw new RpcException(new NotFoundException('Cart not found'));
    }

    cart.items = [];
    cart.totalAmount = 0;
    const savedCart = await cart.save();

    this.logger.log(`Cleared cart for user ${userId}`);
    return {
      _id: savedCart._id,
      userId: savedCart.userId,
      items: savedCart.items,
      totalAmount: savedCart.totalAmount,
    };
  }
}
