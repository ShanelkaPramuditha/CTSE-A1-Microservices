// ============================================
// Cart Service - Mongoose Schema
// ============================================
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CartItemDocument = HydratedDocument<CartItem>;

@Schema({ _id: false })
export class CartItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop()
  image?: string;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

export type CartDocument = HydratedDocument<Cart>;

@Schema({ timestamps: true, collection: 'carts' })
export class Cart {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  @Prop({ default: 0 })
  totalAmount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
