// ============================================
// Product Service - Mongoose Schema
// ============================================
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  @Prop({ required: true, trim: true })
  category: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes for common queries
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 'text', description: 'text' });
